var { app, BrowserWindow, ipcMain } = require('electron');
var path = require('path');
var reUrl = require('url');
var fs = require("fs");
var os = require("os");
var crypto = require('crypto');
var request = require('request');

var projectInfo = new Object();

var mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        center: true,
        resizable: false,
        frame: false
    })

    mainWindow.once('ready-to-show', function() {
        mainWindow.show()
    })

    mainWindow.loadURL(reUrl.format({
        pathname: path.join(__dirname, "html/index.html"),
        protocol: 'file:',
        slashes: true
    }))

	//mainWindow.webContents.openDevTools();
	mainWindow.on('close', function() {
		mainWindow.webContents.send("save-settings");
	})
    mainWindow.on('closed', function() {
        mainWindow = null
    })
}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on('close-main-window', function() {
    app.quit();
});

ipcMain.on('top-main-window', function(event, flag) {
    mainWindow.setAlwaysOnTop(flag);
});

ipcMain.on('mini-main-window', function() {
    mainWindow.minimize();
});

ipcMain.on('update-settings', function(event, config) {
	saveConfig(config);
});