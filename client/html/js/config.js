const { ipcRenderer, clipboard, shell } = require('electron');
var remote = require('electron').remote;
var currentWindow = remote.getGlobal("mainWindow");

const os = require('os');
const dns = require('dns');
const fs = require("fs");
const path = require("path");
const format = require('xml-formatter');
const request = require("request");
const cheerio = require("cheerio");

const cwd = process.cwd();
const logFile = path.join(cwd, "./runningLog");
const soapListFile = path.join(cwd, "./soap-list/soap-list.json");
const configFile = path.join(cwd, "./configuration");

const package = {
	"name": "Soap-Sender",
	"version": "1.0.1",
	"author": "defeng.liu",
	"email": "defeng.liu@deltaww.com",
	"homepage": "http://172.17.92.252:7168"
}

var sessionID = "xxxxxxxxxxxxxxxxxxxxxxxxx";
var config = undefined;

var soapList = [];

function newInfo() {
	this.modelName = "---";
	this.version = "---";
	this.serialNum = "---";
	this.soapVer = "---";
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
				return h("pre", {}, mergeLogTxt(app.logItems[params.index]));
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
}
catch(err) {}

ipcRenderer.on("save-settings", function() {
	var conf = {
		passwd: app.passwd,
		autoAuth: app.autoAuth,
		autoStartEnd: app.autoStartEnd
	}
	try {
		fs.writeFileSync(configFile, JSON.stringify(conf), 'utf-8');
	}
	catch(err) {}
})