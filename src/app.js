import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import env from './js/env';

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

//const manifest = appDir.read('package.json', 'json');

const osMap = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
};


