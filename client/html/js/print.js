const { ipcRenderer } = require('electron');
var remote = require('electron').remote;
const {dialog} = remote;
const format = require('xml-formatter');

ipcRenderer.once('get-pdf-logs', (event, pdfLogs) => {
	Prism.plugins.NormalizeWhitespace.setDefaults({
		'remove-trailing': true,
		'remove-indent': true,
		'left-trim': true,
		'right-trim': true,
		'break-lines': 80,
		'indent': 2,
		//'remove-initial-line-feed': false,
		//'tabs-to-spaces': 2,
		//'spaces-to-tabs': 2
	});

	let app = new Vue({
		el: '#main',
		data: {
			pdfLogs: pdfLogs
		},
		methods: {
			getPrettyBody(str) {
				let temp = formatResponse(str);
				return Prism.highlight(temp, Prism.languages.markup);
			},
			getPrettyReqHeader(obj) {
				let str = `POST http://${obj.ipaddr}/soap/server_sa/ HTTP/${obj.httpVersion}\n`;
				str += obj.reqHeader;
				return Prism.highlight(str, Prism.languages.http);
			},
			getPrettyResHeader(obj) {
				let str = `HTTP ${obj.httpVersion} ${obj.statusCode} ${obj.statusMessage}\n`;
				str += obj.resHeader
				return Prism.highlight(str, Prism.languages.http);
			},
			rowClassName(code) {
				let res = 'basic-info';
				if(code === undefined)
					return (res += ' error');
				else if(code.length === 3 && (code.startsWith('4') || code.startsWith('5')))
					return (res += ' error');
				else if(code !== '0' && code !== '00' && code !== '000')
					return (res += ' invalid');
				return 'basic-info';
			}
		},
		mounted() {
			dialog.showOpenDialog({
				properties: ['openDirectory']
			}, filePaths => {
				if(Array.isArray(filePaths) && filePaths.length > 0) {
					ipcRenderer.send('create-pdf', filePaths[0]);
				}
				else {
					ipcRenderer.send('create-pdf', '', true);
				}
			});
		}
	})
})