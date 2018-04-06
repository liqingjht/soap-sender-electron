layerInit();

let dutIP = getDUTIP();
var routerInfo = new newInfo();
var reqHeaders = defaultHeader();
var reqParams = defaultParams();
var reqMethods = defaultMethods();
var reqActions = defaultActions();
var timings = defaultTimings();
var detailObj = defaultDetailObj();
var tableHeader = logsTableHeader();

const keyMapping = {
	"modelName": "Model Name:",
	"version": "Firmware Version:",
	"serialNum": "Serial Number:",
	"soapVer": "SOAP Version",
	"loginMethod": "Login Method",
	"region": "Region",
	"connection": "Internet Connection:"
}

var app = new Vue({
	el: "#app",
	data: {
		"navIndex": 0,
		"tmpNavIndex": 0,
		"winTop": false,
		"firstLoading": true,
		'comment': '',

		"dutIP": dutIP,
		"passwd": config === undefined?  "password": config.passwd,
		"autoAuth": config === undefined? false: config.autoAuth,
		"autoStartEnd": config === undefined? true: config.autoStartEnd,
		"routerInfo": routerInfo,
		"keyMapping": keyMapping,
		'timeout': config === undefined? '8': config.timeout,

		"tabPane": "options",
		"reqHeaders": reqHeaders,
		"reqParams": reqParams,
		"reqMethods": reqMethods,
		"reqActions": reqActions,
		"method": reqMethods[0],
		"action": reqActions[0],
		"responseTxt": "",
		"prettyResp": "",
		"optSending": false,
		"showPretty": true,
		"timings": timings,
		"detailObj": detailObj,
		'cookie': '',
		'rawPackage': '',

		"logItems": [],
		"tableHeader": tableHeader,
		'pdfLogs': [],

		"appName": package.name,
		"author": package.author,
		"email": package.email,
		"version": package.version,
		"checkUpdateError": false,
		"haveNew": false,
		"newVersion": "",
		"checking": false,
		"oldAppPath": ""
	},
	computed: {
		username: function() {
			return getUserInfo().username;
		},
		hostname: function() {
			return getUserInfo().hostname;
		},
		getIPArr: function() {
			return getLocalIP();
		},
		loginStatus() {
			let loginMethod = this.routerInfo.loginMethod;
			loginMethod = parseInt(loginMethod);
			if(isNaN(loginMethod) || loginMethod < 2)
				return true;
			return false;
		},
		logoutStatus() {
			let loginMethod = this.routerInfo.loginMethod;
			loginMethod = parseInt(loginMethod);
			if(isNaN(loginMethod) || loginMethod < 2 || this.cookie.trim() === '')
				return true;
			return false;
		},
		sendStatus() {
			let model = this.routerInfo.modelName;
			if(model === undefined || model.trim() === '' || model === '---')
				return true;
			return false;
		}
	},
	watch: {
		method: function updateAction(val) {
			let index = this.reqMethods.indexOf(val);
			if(index === -1) {
				this.reqActions = [];
				this.reqParams = [];
			}
			else {
				this.reqActions = getAllActions(val);
			}
		},
		action: function updateParam(val) {
			let index = this.reqActions.indexOf(val);
			if(index === -1) {
				this.reqParams = [];
			}
			else {
				this.reqParams = getAllParams(val);
			}
		},
		cookie() {
			if(this.cookie.trim() !== '') {
				this.autoAuth = false;
			}
		}
	},
	methods: {
		// navigation
		toggleMenu: function() {
			document.querySelector('.nav__list').classList.toggle('nav__list--active');
			document.querySelector('.burger').classList.toggle('burger--active');
		},
		winMini: function() {
			ipcRenderer.send('mini-main-window');
		},
		winClose: function() {
			ipcRenderer.send('close-main-window');
		},
		toggleWinTop: function() {
			this.winTop = !this.winTop;
			ipcRenderer.send('top-main-window', this.winTop);
		},
		switchPanle: function(event) {
			loadEffect(event);
			let _this = this;
			if(this.tmpNavIndex === 2) {
				readLogs(function(err, arr) {
					app.logItems = arr.slice(0, 15);
				})
			}
			else if(this.tmpNavIndex === 1) {
				this.tabPane = "options";
			}
			else if(this.tmpNavIndex === 3) {
				this.checkUpdate();
			}
		},
		renderComment() {
			this.$Modal.confirm({
				okText: 'Send Comments',
				cancelText: 'Cancel',
				render: (h) => {
					return h('i-input', {
						props: {
							type: 'textarea',
							value: this.comment,
							rows: 5,
							autofocus: true,
							placeholder: 'What do you want to say to me...'
						},
						class: {
							'confirm-model': true
						},
						on: {
							input: (val) => {
								this.comment = val;
							}
						}
					})
				},
				onOk: () => {
					let comment = this.comment.trim();
					if(comment === '') {
						this.$Message.warning("Say somethings, don't be shy");
						return;
					}
					sendComment(package.homepage, comment, (err) => {
						if(err) {
							this.$Message.error('Send comments failed');
							return;
						}
						this.$Message.success('I got you');
						this.comment = '';
					})
				},
				onCancel: () => {
					let comment = this.comment.trim();
					if(comment === '') {
						this.$Message.warning("Say somethings, don't be shy");
						return;
					}
				}
			})
		},

		//basic settings
		handleIPChange: function() {
			let result = isIPFormat(this.dutIP);
			if(result === false) {
				app.$Message.warning("Invalid IP address");
				return;
			}
			this.dutIP = result;
			updateRouterInfo(this.dutIP, "The IP address you input may not access to Router");
			updateDeviceInfo(this.dutIP);
		},
		handlePasswdChange: function(event) {
			if(this.autoAuth !== true)
				return;
			let _this = this;
			if(isIPFormat(this.dutIP) === false)
				return;
			sendAuthForPasswd(this.dutIP, this.passwd, function(err) {
				if(err) {
					if(event !== undefined)
						_this.$Message.warning("The password you input may not correct");
					else
						_this.$Message.warning("The default password may not correct");
				}
				else {
					_this.$Message.success("Pass the password checking. Already login by Authenticate API");
				}
			});
		},
		soapLogin() {
			sendSoapLogin(this.dutIP, this.passwd, (err, resp) => {
				if(err) {
					this.$Message.error('Login by SOAPLogin API failed');
					return;
				}
				let cookie = getCookie(resp);
				if(cookie === '') {
					this.$Message.warning('SOAP API sent successfully but can not get cookie');
					return;
				}
				this.cookie = cookie;
				let headers = this.reqHeaders;
				for(let i=0; i<headers.length; i++) {
					if(headers[i][0].toLowerCase() === 'cookie') {
						headers.splice(i, 1);
						break;
					}
				}
				if(headers.length > 5) {
					headers.pop();
				}
				headers.push(['Cookie', cookie]);
				this.reqHeaders = headers;
				this.$Message.success('Login successfully and set cookie');
			})
		},
		soapLogout() {
			sendSoapLogout(this.dutIP, this.cookie, (err) => {
				if(err) {
					this.$Message.error('Logout by SOAPLogout API failed');
					return;
				}
				this.cookie = '';
				let headers = this.reqHeaders;
				for(let i=0; i<headers.length; i++) {
					if(headers[i][0].toLowerCase() === 'cookie') {
						headers.splice(i, 1);
						break;
					}
				}
				this.reqHeaders = headers;
				this.$Message.success('Logout successfully and clear cookie');
			})
		},

		// request
		addNewParam: function() {
			if(this.reqParams.length > (15 -1)) {
				this.$Message.warning("Reach the maximum number of parameter");
				return;
			}
			this.reqParams.push(["", ""]);
		},
		rmReqParam: function(index) {
			this.reqParams.splice(index, 1);
		},
		addNewHeader: function() {
			let len = 5;
			let headers = this.reqHeaders;
			for(let i=0; i<headers.length; i++) {
				if(headers[i][0].toLowerCase().trim() === 'cookie') {
					len = 6;
					break;
				}
			}
			if(this.reqHeaders.length > (len - 1)) {
				this.$Message.warning("Reach the maximum number of header");
				return;
			}
			this.reqHeaders.push(["", ""]);
		},
		rmReqHeader: function(index) {
			let key = this.reqHeaders[index][0];
			if(key.toLowerCase().trim() === 'cookie') {
				this.$Message.warning('Remove cookie for this session. Login again to get Cookie if you need');
				this.cookie = '';
			}
			this.reqHeaders.splice(index, 1);
		},
		autoFilter: function(value, option) {
			return option.toUpperCase().indexOf(value.toUpperCase()) !== -1;
		},
		optSend: async function() {
			let {method, action, reqHeaders, reqParams} = this;
			if(method === "" || action === "") {
				this.$Message.error("Invalid SOAP method or action");
			}
			if(!checkSoapOption(this, 'reqHeaders', reqHeaders) || !checkSoapOption(this, 'reqParams', reqParams)) {
				this.$Message.error("Invalid SOAP package");
				return false;
			}

			if(!(method === "ParentalControl" && action === "Authenticate") && this.autoAuth) {
				if((await sendAuth()) === false) {
					this.$Message.warning("Auto send authenticate failed");
				}
			}

			if(this.autoStartEnd) {
				if((await sendConfigStart()) === false) {
					this.$Message.warning("Auto send ConfigurationStarted failed");
				}
			}

			this.toggleSendStatus();
			this.$Loading.start();
			let _this = this;
			sendSoap(async function(err, resp, data) {
				_this.toggleSendStatus();
				if(data === undefined)
					data = "";
				_this.responseTxt = data;
				let tempData = formatResponse(data);
				_this.prettyResp = Prism.highlight(tempData, Prism.languages.markup);
				setResponDetail(resp);
				if(err) {
					_this.$Loading.error();
					_this.$Message.error(`Send SOAP ${_this.method}:${_this.action} failed`);
					setTimings();
					return;
				}
				addNewLog(_this.routerInfo.modelName, _this.method, _this.action, resp, reqHeaders, reqParams);
				setTimings(resp.timings);
				_this.$Loading.finish();
				_this.tabPane = "response";
				addSoapList(_this.method, _this.action, _this.reqParams);

				if(_this.autoStartEnd) {
					if((await sendConfigFinish()) === false) {
						_this.$Message.warning("Auto send ConfigurationFinished failed");
					}
				}
			});
		},
		toggleSendStatus: function() {
			this.optSending = !this.optSending;
		},
		togglePretty: function() {
			this.showPretty = !this.showPretty;
		},
		copyResponse: function() {
			let id = this.showPretty? "#pretty-response": "#raw-response";
			clipboard.writeText($(id).text());
			this.$Message.success("Copy content to clipboard successfully");
		},
		checkTimeout() {
			let timeout = this.timeout;
			timeout = parseInt(timeout);
			if(isNaN(timeout)) {
				this.$Message.warning('Invalid input for timeout value');
				this.timeout = '8';
				return;
			}
			this.timeout = String(timeout);
		},
		parsePackage() {
			let str = this.rawPackage;
			let warn = (msg) => {this.$Message.warning(msg)};
			str = str.trim().replace(/\n(^\s*$){2,}/m, '\n');
			this.rawPackage = str;
			if(str === '') {
				warn('Paste HTTP(s) SOAP request package');
				return;
			}
			let lines = str.replace(/\r\n/g, '\n').split('\n');
			if(lines[0].toLowerCase().startsWith('post')) {
				lines.shift();
			}
			let blank = lines.findIndex(v => v.trim() === '');
			if(blank === -1) {
				warn('Can not find blank line in your input package');
				return;
			}
			let headers = lines.slice(0, blank);
			let body = lines.slice(blank + 1).join('\n');
			let rawBody = body;

			let reqHeaders = [], method, action;
			let len = headers.length;
			for(i=0; i<len; i++) {
				let header = headers[i];
				let [key, ...value] = header.split(':');
				if(value.length === 0) {
					warn(`Invalid HTTP header format found in line ${i}`);
					return;
				}
				value = value.join(':');
				value = value.trim();
				key = key.trim();
				if(key === '' || value === '') {
					warn(`Invalid HTTP header format found in line ${i}`);
					return;
				}
				let lowKey = key.toLowerCase();
				if(['cookie', 'content-length'].includes(lowKey)) {
					continue;
				}
				if(key === 'SOAPAction') {
					if(/^.+?[a-z0-9]+\s*:\s*\d+#[a-z0-9]+$/i.test(value) === true) {
						method = value.replace(/^.+?([a-z0-9]+)\s*:\s*\d+#([a-z0-9]+)$/i, '$1');
						action = value.replace(/^.+?([a-z0-9]+)\s*:\s*\d+#([a-z0-9]+)$/i, '$2');
					}
					continue;
				}
				reqHeaders.push([key, value]);
			}

			if(method === undefined || action === undefined) {
				warn(`Can not find SOAP method and action`);
				return;
			}

			if(this.cookie !== '') {
				reqHeaders.push(['Cookie', this.cookie]);
			}

			let reqParams = [];
			body = body.replace(/(<\/?)SOAP-ENV\s*:\s*/ig, '$1');
			let $ = cheerio.load(body);
			let notFound = (res) => {
				if(Boolean(res) === false || res.length === undefined || res.length === 0)
					return true;
				return false;
			}
			let envelope = $.root().children('envelope');
			if(notFound(envelope)) {
				warn('Can not find Envelope in document root');
				return;
			}
			let nodeBody = envelope.children('body');
			if(notFound(nodeBody)) {
				warn('Can not find Body in Envelope element');
				return;
			}
			body = nodeBody.html().replace(/<\/?m1\s*:[^<>]+>/gim, '');
			body = body.replace(/(<)\s*(\/?)\s*([^\s<>]+)(\s+[^<>]+)?\s*(>)/g, '$1$2$3$5');
			$ = cheerio.load(body);
			let all = $.root().find('*');
			all.each((k, v) => {
				let name = v.name;
				let pattern = new RegExp(`<\\s*\\/?\\s*(${name})`, 'i');
				let res = rawBody.match(pattern);
				if(Boolean(res) === false || !Array.isArray(res) || res.length < 1) {
					return true;
				}
				name = res[0].trim();
				name = name.replace(/^<\s*\/?\s*(.+)$/, '$1');
				let val = all.eq(k).html();
				reqParams.push([name, val]);
			})

			this.method = method;
			this.action = action;

			this.$Message.success('Parse HTTP request package successfully');
			setTimeout(() => {
				this.reqHeaders = reqHeaders;
				this.reqParams = reqParams;
				this.tabPane = 'options';
			}, 500)
		},

		// history
		handleReachBottom: function() {
			let _this = this;
			return new Promise(resolve => {
				readLogs(function(err, arr) {
					let len = _this.logItems.length;
					let newArr = arr.slice(len, len + 15);
					if(newArr.length > 0)
						_this.logItems = _this.logItems.concat(newArr);
					resolve();
				})
			});
		},
		deleteLog: function(index) {
			if(index >= 0 && index <= this.logItems.length) {
				this.logItems.splice(index, 1);
				saveLogs(this.logItems);
			}
		},
		resendLog: function(index) {
			let obj = this.logItems[index];
			if(obj === undefined) {
				this.$Message.error("Occur Error");
				return;
			}
			this.method = obj.method;
			this.action = obj.action;
			this.reqHeaders = obj.rawHeaders;
			this.reqParams = obj.rawParams;
			this.tabPane = "options";
			this.responseTxt = "";
			this.prettyResp = "";
			this.showPretty = true;
			this.timings = defaultTimings();
			this.detailObj = defaultDetailObj();
			this.tmpNavIndex = 1;
			this.navIndex = 1;
		},
		rowClassName: function(row, index) {
			let code = this.logItems[index].resCode;
			if(code === undefined)
				return 'row-error-code';
			else if(code.length === 3 && (code.startsWith('4') || code.startsWith('5')))
				return 'row-error-code';
			else if(code !== '0' && code !== '00' && code !== '000')
				return 'row-invalid-code';
			return 'row-success-code';
		},
		handleSelect(selection) {
			this.pdfLogs = selection;
		},
		exportPdf() {
			if(this.pdfLogs.length === 0) {
				this.$Message.warning('Select some logs to export');
				return;
			}
			ipcRenderer.send('print-pdf', this.pdfLogs);
			ipcRenderer.once('pdf-end', (event, saver, status) => {
				if(status === 1) {
					this.$Message.error('Occur error when import pdf');
					return;
				}
				else if(status === 0) {
					this.$Message.success(`Exported ${saver}`);
				}
			});
		},
		exportTxt() {
			if(this.pdfLogs.length === 0) {
				this.$Message.warning('Select some logs to export');
				return;
			}
			let _this = this;
			dialog.showOpenDialog({
				properties: ['openDirectory']
			}, filePaths => {
				if(Array.isArray(filePaths) && filePaths.length > 0) {
					let logs = _this.pdfLogs;
					let saver = '';
					let len = logs.length;
					let eol = os.EOL;
					for(let i=0; i<len; i++) {
						saver += mergeLogTxt(logs[i], eol);
						saver += (i === len -1)? '': `${eol.repeat(4)}${'='.repeat(45)}${eol.repeat(4)}`;;
					}
					let cur = new Date();
					let now = `${cur.getFullYear()}-${cur.getMonth() + 1}-${cur.getDate()}`;
					let savePath = path.join(filePaths[0], `./Soap-Sender-${now}.txt`);
					fs.writeFile(savePath, saver, (err) => {
						if(err) {
							_this.$Message.error('Occur error when export txt');
							return;
						}
						_this.$Message.success(`Exported ${path.basename(savePath)}`);
						shell.showItemInFolder(savePath);
					})
				}
			});
		},

		// APP info and configurations
		checkUpdate: function(firstLoad) {
			let _this = this;
			this.checking = true;
			getVersion(package.homepage, function(err, ver) {
				if(err) {
					_this.checkUpdateError = true;
					_this.haveNew = false;
				}
				else {
					let cur = _this.version;
					let c = cur.split(".");
					let n = ver.split(".");
					let [c0, c1, c2] = c.map(v => parseInt(v));
					let [n0, n1, n2] = n.map(v => parseInt(v));
					if((n0 > c0) || (n0 === c0 && n1 > c1) || (n0 === c0 && n1 === c1 && n2 > c2)) {
						_this.checkUpdateError = false;
						_this.haveNew = true;
						_this.newVersion = ver;
						if(firstLoad === true) {
							new Notification('Soap-Sender', {
								body: 'New version has been found. Goto APP info panel to check.'
							  })
							_this.$Message.success('New version has been found. Goto APP info panel to check.');
						}
					}
					else {
						_this.checkUpdateError = false;
						_this.haveNew = false;
					}
				}

				setTimeout(() => {
					_this.checking = false;
				}, 500);
			});
		},
		openHomePage: function() {
			shell.openExternal(package.homepage);
		},
		clearLog() {
			fs.access(logFile, err => {
				if(err) {
					this.$Message.success('Clear history successfully');
					return;
				}
				fs.unlink(logFile, err => {
					if(err) {
						this.$Message.error('Occur error when clear history');
						return;
					}
					this.$Message.success('Clear history successfully');
				})
			})
		},
		resetConfig() {
			let isErr = false;
			this.passwd = "password";
			this.autoAuth = false;
			this.autoStartEnd = true;
			this.timeout = '8';
			isErr = !saveSettings();
			try {
				fs.writeFileSync(soapListFile, fs.readFileSync(defListFile));
			}
			catch(err) {
				isErr = true;
			}
			if(isErr) {
				this.$Message.error('Occur error when reset configurations');
				return;
			}
			bindMethodAndAction();
			this.$Message.success('Reset configurations successfully');
		},
		openFileManage() {
			dialog.showOpenDialog({
				properties: ['openDirectory']
			}, filePaths => {
				if(Array.isArray(filePaths) && filePaths.length > 0) {
					this.oldAppPath = filePaths[0];
				}
			});
		},
		importLog() {
			if(this.oldAppPath === '') {
				this.$Message.warning('Select old App root folder on the right firstly');
				return;
			}
			let oldPath = path.join(this.oldAppPath, './runningLog');
			fs.access(oldPath, err => {
				if(err) {
					this.$Message.error('Can not find history in this folder');
					return;
				}
				try {
					fs.writeFileSync(logFile, fs.readFileSync(oldPath));
					this.$Message.success('Import history successfully');
				}
				catch(err) {
					this.$Message.error('Occur error when import history');
				}
			})
		},
		importList() {
			if(this.oldAppPath === '') {
				this.$Message.warning('Select old App root folder on the right firstly');
				return;
			}
			let oldPath = path.join(this.oldAppPath, './soap-list.json');
			fs.access(oldPath, err => {
				if(err) {
					oldPath = path.join(this.oldAppPath, './resources/app.asar/soap-list/soap-list.json');
					try {
						fs.accessSync(oldPath);
					}
					catch(err) {
						this.$Message.error('Can not find SOAP list in this folder');
						return;
					}
				}
				try {
					fs.writeFileSync(soapListFile, fs.readFileSync(oldPath));
					this.$Message.success('Import SOAP list successfully');
					bindMethodAndAction();
				}
				catch(err) {
					this.$Message.error('Occur error when import SOAP list');
				}
			})
		},
		openSavePath() {
			shell.showItemInFolder(this.oldAppPath);
		}
	},
	created: function() {
		$(".panel > div").css("display", "block");
	},
	beforeMount: function() {
		if(this.dutIP.trim() !== "") {
			updateRouterInfo(this.dutIP);
			updateDeviceInfo(this.dutIP);
		}

		this.$Message.config({
			top: 10,
			duration: 5
		});
	},
	mounted: function() {
		if(this.dutIP.trim() !== "") {
			this.handlePasswdChange();
		}

		bindMethodAndAction();

		let _this = this;
		setTimeout(function() {
			_this.firstLoading = false;
		}, 1000);

		this.checkUpdate(true);
	},
	updated: function() {
		//Prism.highlightAll(true);
	}
})