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

		"dutIP": dutIP,
		"passwd": config === undefined?  "password": config.passwd,
		"autoAuth": config === undefined? true: config.autoAuth,
		"autoStartEnd": config === undefined? true: config.autoStartEnd,
		"routerInfo": routerInfo,
		"keyMapping": keyMapping,

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

		"logItems": [],
		"tableHeader": tableHeader,

		"appName": package.name,
		"author": package.author,
		"email": package.email,
		"version": package.version,
		"checkUpdateError": false,
		"haveNew": false,
		"newVersion": "",
		"checking": false
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
					_this.$Message.success("Pass the password checking");
				}
			});
		},

		// request
		addNewParam: function() {
			if(this.reqParams.length > (15 -1)) {
				this.$Message.warning("Reach the maximum number of parameter");
				return;
			}
			this.reqParams.push(["", ""]);
		},
		rmReqParam: function() {
			let index = $(event.target).parents(".one-option").attr("data-index");
			this.reqParams.splice(index, 1);
		},
		addNewHeader: function() {
			if(this.reqHeaders.length > (6 - 1)) {
				this.$Message.warning("Reach the maximum number of header");
				return;
			}
			this.reqHeaders.push(["", ""]);
		},
		rmReqHeader: function(event) {
			let index = $(event.target).parents(".one-option").attr("data-index");
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
			if(!checkSoapOption(reqHeaders) || !checkSoapOption(reqParams)) {
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
			let code = this.logItems[index].resCode;console.log(code)
			if(code !== "000" && code !== "00" && code !== "0") {
				return "row-error-code";
			}
			else {
				return "row-success-code";
			}
		},

		checkUpdate: function() {
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
					let l = ver.split(".");
					if(parseInt(l[0]) > parseInt(c[0]) || parseInt(l[1]) > parseInt(c[1]) || parseInt(l[2]) > parseInt(c[2])) {
						_this.checkUpdateError = false;
						_this.haveNew = true;
						_this.newVersion = ver;
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
			duration: 7
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
	},
	updated: function() {
		//Prism.highlightAll(true);
	}
})