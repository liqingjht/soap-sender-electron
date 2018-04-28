const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const reUrl = require('url');
const fs = require("fs");
const os = require("os");
const crypto = require('crypto');
const request = require('request');

let mainWindow;

app.on('ready', () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false,
		center: true,
		resizable: false,
		frame: false
	})

	mainWindow.once('ready-to-show', () => {
		mainWindow.show()
	})

	mainWindow.loadURL(reUrl.format({
		pathname: path.join(__dirname, "html/index.html"),
		protocol: 'file:',
		slashes: true
	}))

	//mainWindow.webContents.openDevTools();
	mainWindow.on('close', () => {
		mainWindow.webContents.send("save-settings");
	})
	mainWindow.on('closed', () => {
		mainWindow = null
	})
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

ipcMain.on('close-main-window', () => {
    app.quit();
});

ipcMain.on('top-main-window', (event, flag) => {
    mainWindow.setAlwaysOnTop(flag);
});

ipcMain.on('mini-main-window', () => {
    mainWindow.minimize();
});

ipcMain.on('update-settings', (event, config) => {
	saveConfig(config);
});

ipcMain.on('print-pdf', (event, pdfLogs) => {
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