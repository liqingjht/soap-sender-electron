var { app, BrowserWindow, ipcMain, shell } = require('electron');
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

ipcMain.on('print-pdf', function(event, pdfLogs) {
	let win = new BrowserWindow({
		show: false,
		width: 800,
        height: 1200
	});
	//win.webContents.openDevTools();
	win.loadURL(reUrl.format({
        pathname: path.join(__dirname, "html/print.html"),
        protocol: 'file:'
	}))

	win.webContents.once('did-finish-load', () => {
		win.webContents.send('get-pdf-logs', pdfLogs);
	})

	ipcMain.once('create-pdf', (event, savePath, abort) => {
		if(abort === true) {
			mainWindow.webContents.send('pdf-end', '', -1);
			return;
		}
		let cur = new Date();
		let now = `${cur.getFullYear()}-${cur.getMonth() + 1}-${cur.getDate()}`;
		saver = path.join(savePath, `./Soap-Sender-${now}.pdf`);
		win.webContents.printToPDF({
			marginsType: 0,
			pageSize: 'A4',
			printBackground: true
		}, (err, data) => {
			fs.writeFile(saver, data, (error) => {
				if (error) {
					mainWindow.webContents.send('pdf-end', '', 1);
					return;
				}
				mainWindow.webContents.send('pdf-end', path.basename(saver), 0);
				shell.showItemInFolder(saver);
			})
		})
	})
});