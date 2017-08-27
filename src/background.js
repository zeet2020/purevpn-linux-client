(function(){

'use strict';

var _ = require('lodash');


const {
  ipcRenderer,
  dialog,
	app,
	BrowserWindow,
	crashReporter,
  Tray
} = require('electron')
var path = require('path');
let tray = null;
// ####################################################
// ####################################################

// Report crashes to our server.
crashReporter.start({
  productName: 'purevpn linux client',
  companyName: '',
  submitURL: '',
  autoSubmit: true
})

var mainWindow = null;
var options = {
	"debug": false,
	"version": "1.0.0",
	"root_view": "app.html"
};

options = _.extend({
	// ADDITIONAL CUSTOM SETTINGS
}, options);

// ############################################################################################
// ############################################################################################

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if(process.platform !== 'darwin') { app.quit(); }
});


var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (shouldQuit) {
  app.quit();
  return;
}



app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600, resizable:false});
  console.log(path.join('file://', __dirname,options.root_view));
  mainWindow.loadURL(path.join('file://', __dirname,options.root_view));

  if(options.debug) {
    mainWindow.openDevTools();
  }


  mainWindow.on('closed', function() {
   mainWindow = null;
  });

  //mainWindow.setMenuBarVisibility(true);

  mainWindow.on("show",function(e){
     console.log("show");
     mainWindow.setResizable(false);
  });

});

})();
