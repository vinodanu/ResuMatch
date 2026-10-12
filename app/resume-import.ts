export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export async function extractResume(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new Error('Please choose a resume smaller than 10 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf','doc','docx','txt','md'].includes(extension || '')) throw new Error('Choose a PDF, DOC, DOCX, TXT or Markdown resume.');
  let text = '';
  if(extension === 'txt' || extension === 'md') text = await file.text();
  else {
    const buffer = await file.arrayBuffer();
    if(extension === 'pdf') {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const task = pdfjs.getDocument({data:new Uint8Array(buffer)});
      try {
        const pdf=await task.promise;
        if(pdf.numPages>50) throw new Error('Please upload a resume with 50 pages or fewer.');
        const pages:string[]=[];
        for(let i=1;i<=pdf.numPages;i++) {
          const page=await pdf.getPage(i);const content=await page.getTextContent();
          pages.push(content.items.map(item=>'str' in item ? item.str+('hasEOL' in item && item.hasEOL?'\n':' ') : '').join(''));
          page.cleanup();
        }
        text=pages.join('\n\n');
      } catch(error) {
        if(error instanceof Error && error.name==='PasswordException') throw new Error('This PDF is password-protected. Upload an unlocked copy.');
        throw error;
      } finally { await task.destroy(); }
    } else if(extension==='docx') {
      const mammoth=await import('mammoth/mammoth.browser');
      text=(await mammoth.extractRawText({arrayBuffer:buffer})).value;
    } else {
      text=await extractLegacyDoc(new Uint8Array(buffer));
    }
  }
  text=text.replace(/\r/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim();
  if(text.replace(/\s/g,'').length<20) throw new Error('No readable resume text was found. Scanned PDFs need OCR; paste the text or upload a text-based PDF or Word file.');
  if(text.length>250000) throw new Error('The extracted document is too long. Please upload only your resume.');
  return text;
}
export async function extractLegacyDoc(bytes:Uint8Array):Promise<string>{
  // Word 97–2003 stores text in pieces described by the CLX table.
  const CFB=await import('cfb');
  const compound=CFB.read(bytes,{type:'array'});
  const word=CFB.find(compound,'WordDocument');
  if(!word?.content) throw new Error('This is not a supported Word DOC file. Save it as DOCX and try again.');
  const data=new Uint8Array(word.content as Uint8Array);const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  if(view.getUint16(0,true)!==0xa5ec||view.getUint16(2,true)<0x00c1) throw new Error('This older DOC format is unsupported. Save it as DOCX and try again.');
  const flags=view.getUint16(10,true);
  if(flags & 0x0100 || flags & 0x8000) throw new Error('This DOC file is encrypted. Upload an unlocked DOCX copy.');
  const tableEntry=CFB.find(compound,flags & 0x0200?'1Table':'0Table');
  if(!tableEntry?.content) throw new Error('Unable to read DOC text. Save it as DOCX and try again.');
  const table=new Uint8Array(tableEntry.content as Uint8Array);const tv=new DataView(table.buffer,table.byteOffset,table.byteLength);
  let offset=32;const csw=view.getUint16(offset,true);offset+=2+csw*2;
  const cslw=view.getUint16(offset,true);offset+=2+cslw*4;
  const pairs=view.getUint16(offset,true);offset+=2;
  if(pairs<=33||offset+34*8>data.length) throw new Error('DOC text table is missing. Please save as DOCX.');
  const clxStart=view.getUint32(offset+33*8,true),clxLength=view.getUint32(offset+33*8+4,true);
  if(!clxLength||clxStart+clxLength>table.length) throw new Error('DOC text table is invalid. Please save as DOCX.');
  let pos=clxStart;const end=clxStart+clxLength;
  while(pos<end&&table[pos]===1){if(pos+3>end)throw new Error('Invalid DOC file.');pos+=3+tv.getUint16(pos+1,true);}
  if(pos+5>end||table[pos]!==2)throw new Error('Unable to extract DOC text. Please save as DOCX.');
  const length=tv.getUint32(pos+1,true);pos+=5;
  if(length<4||(length-4)%12!==0||pos+length>end)throw new Error('Invalid DOC piece table.');
  const count=(length-4)/12;const descriptors=pos+(count+1)*4;const output:string[]=[];
  const ansi=new TextDecoder('windows-1252'),unicode=new TextDecoder('utf-16le');
  // ccpText excludes headers, comments and other non-body stories.
  const bodyLength=view.getUint32(32+2+csw*2+2+3*4,true);
  for(let i=0;i<count;i++){
    const start=tv.getUint32(pos+i*4,true),finish=Math.min(tv.getUint32(pos+(i+1)*4,true),bodyLength);
    if(start>=bodyLength)break;if(finish<start)throw new Error('Invalid DOC text range.');
    const fc=tv.getUint32(descriptors+i*8+2,true),compressed=!!(fc&0x40000000),fileOffset=(fc&0x3fffffff)/(compressed?2:1),size=(finish-start)*(compressed?1:2);
    if(fileOffset+size>data.length)throw new Error('Invalid DOC text offset.');
    output.push((compressed?ansi:unicode).decode(data.subarray(fileOffset,fileOffset+size)));
  }
  return output.join('').replace(/\x07/g,'\t');
}
