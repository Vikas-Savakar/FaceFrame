/** Same-origin public assets respect Vite's actual deployment base. */
export function resolveAssetPath(path:string,base='/'):string {
  if(path.startsWith('https://'))return path;
  if(!base.startsWith('/')||!base.endsWith('/')||base.includes('..'))throw new Error('Use an absolute deployment base ending in /.');
  return base+path.replace(/^\/+/, '');
}
export const appAssetUrl=(path:string)=>resolveAssetPath(path,import.meta.env.BASE_URL);
