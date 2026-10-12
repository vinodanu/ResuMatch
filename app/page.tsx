import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import Workspace from './workspace';
export const dynamic = 'force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <Workspace name={user?.displayName || null} signIn={chatGPTSignInPath('/')} signOut={chatGPTSignOutPath('/')} />;}
