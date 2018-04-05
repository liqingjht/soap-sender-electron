const { ipcRenderer, clipboard, shell } = require('electron');
var remote = require('electron').remote;
const {dialog} = remote;
var currentWindow = remote.getGlobal("mainWindow");

const os = require('os');
const dns = require('dns');
const fs = require("fs");
const path = require("path");
const format = require('xml-formatter');
const request = require("request");
const cheerio = require("cheerio");
const package = require(path.join(__dirname, "../package.json"));

const cwd = process.cwd();
const logFile = path.join(cwd, "./runningLog");
const defListFile = path.join(__dirname, '../soap-list/soap-list.json'); // __dirname is html
const soapListFile = path.join(cwd, "./soap-list.json");
const configFile = path.join(cwd, "./configuration");

try {
	fs.accessSync(soapListFile);
}
catch(err) {
	try{
		fs.writeFileSync(soapListFile, fs.readFileSync(defListFile));
	}
	catch(err){/*do nothing*/}
}

var sessionID = "DNI-Soap-Sender-Session-ID-X";
var config = undefined;

var soapList = [];

function newInfo() {
	this.modelName = "---";
	this.version = "---";
	this.serialNum = "---";
	this.soapVer = "---";
	this.loginMethod = "---"
	this.region = "---";
	this.connection = "---";
}

function defaultHeader() {
	return [
		["HOST", "www.routerlogin.com"],
		["Content-type", "text/xml;charset=utf-8"],
		["User-Agent", "SOAP-Sender"]
	];
}

function defaultParams() {
	return [];
}

function defaultMethods() {
	return ["DeviceInfo"];
}

function defaultActions() {
	return ["GetInfo"];
}

function defaultTimings() {
	return {
		"socket": 0,
		"lookup": 0,
		"connect": 0,
		"response": 0,
		"end": 0
	}
}

function defaultDetailObj() {
	return {
		"reqHeader": "",
		"reqBody": "",
		"rspHeader": "",
		"rspBody": ""
	}
}

function logsTableHeader() {
	return  [
		{
			type: 'selection',
			width: 60,
			align: 'center'
		},
		{
			title: "Time",
			key: "testTime",
			width: 125,
			align: 'center'
		},
		{
			type: 'expand',
			width: 40,
			align: 'center',
			render: (h, params) => {
				return h("pre", {
					class: {
						'package-break-line': true
					}
				}, mergeLogTxt(app.logItems[params.index]));
			}
		},
		{
			title: 'Model Name',
			key: 'model',
			align: 'center'
		},
		{
			title: 'Method',
			key: 'method',
			align: 'center'
		},
		{
			title: 'Action',
			key: 'action',
			align: 'center'
		},
		{
			title: 'Response Code',
			key: 'resCode',
			align: 'center'
		},
		{
			title: 'Cost Time (ms)',
			key: 'costTime',
			align: 'center',
			sortable: true
		},
		{
			title: 'Action',
			key: 'action',
			width: 180,
			align: 'center',
			render: function(h, params) {
				return h('div', [
					h('i-button', {
						props: {
							type: 'error',
							size: 'small'
						},
						on: {
							click: function() {
								app.deleteLog(params.index);
							}
						}
					}, 'Delete'),
					h('i-button', {
						props: {
							type: 'primary',
							size: 'small'
						},
						style: {
							"margin-left": "15px"
						},
						on: {
							click: function() {
								app.resendLog(params.index);
							}
						}
					}, 'Resend')
				]);
			}
		}
	]
}

try {
	let data = fs.readFileSync(configFile, "utf-8");
	let conf = JSON.parse(data);
	if(conf.passwd !== undefined && conf.autoStartEnd !== undefined && conf.autoAuth !== undefined) {
		config = conf;
	}
	if(config.timeout === undefined)
		config.timeout = '8';
}
catch(err) {}

function saveSettings() {
	var conf = {
		passwd: app.passwd,
		autoAuth: app.autoAuth,
		autoStartEnd: app.autoStartEnd,
		timeout: app.timeout
	}
	try {
		fs.writeFileSync(configFile, JSON.stringify(conf), 'utf-8');
		return true;
	}
	catch(err) {
		return false;
	}
}

ipcRenderer.on("save-settings", saveSettings)