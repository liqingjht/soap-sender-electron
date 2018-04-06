<h2>Soap-Sender 主页</h2>

<b>@ 仅供交流学习，禁止商业使用</b>

目录结构：

server: 用来启动展示主页、检索版本、存储意见

client: 用来构建客户端软件

----------


如何构建 app

1. 在 client 内运行 npm install --production
2. 全局安装 electron 和 electron-packager 
3. electron -v 查看 electron 版本，修改 package.json 里的 scripts 相对应的 electron 版本号
4. npm run pk-win (或者 pk-linux pk-mac)

注意点:

1. 因为用 npm 安装 electron 特别慢，即使设置了软件源也还是一样。 所以用 cnpm 来安装
2. 如果用 npm 在项目里安装依赖，就不能使用 cnpm run pk-win，会导致找不到模块，npm 和 cnpm 不能混用
3. 不要在项目里安装开发依赖，如 electron 和 electron-packager，会导致包特别大
4. 本来可以直接安装开发依赖，使用 prune 选项 和制定包管理器为 cnpm 来删除开发依赖，这样不用在打包命令上指定 electron 版本号，但是在 windows 上不能指定包管理器为 cnpm
5. 最好不要将打包输出路径放在项目里，会导致打包很大
6. mac 版本不要在 windows 上打包，即使用管理员权限可以打包成功，最后要压缩文件夹的时候会有文件权限失败，在 linux 机子上打包
7. linux 版本的在 linux 机子上打包，在 root 权限下打包，赋予执行权限，用普通账户运行
8. linux 需要安装 libgconf，运行命令 sudo apt-get install libgconf-2-4 来安装

----------

<p>使用说明：</p>
<ol>
<li>
<p><strong>下载和使用</strong></p>
<p>1-1. 软件下载后 .zip 后缀，解压缩后得到一个 exe 自解压文件。双击 exe 文件解压后得到一个文件夹。运行文件夹里面 Soap-Sender.exe 文件就可以使用软件。你也可以对这个文件做一个快捷方式。</p>
<p>1-2. 如果你更新了软件，但是又想要保留原来的设置和记录，在新软件的版本信息页面选择旧软件的根目录，点击导入即可。</p>

</li>
<li>
<p><strong>导航菜单</strong></p>
<p><img src="/server/image/basic.png" /></p>
<p>2-1. 右上从左到右分别为： 对作者提建议，软件界面锁定在顶层开关，最小化和关闭</p>
<p>2-2. 左边导航从上到下分别为：导航伸缩开关，基本设置页面，发包页，历史记录页和软件版本信息和设置页</p>
</li>
<li>
<p><strong>基本设置页</strong></p>
<p>3-1. IP 是通过获得所有 DNS 地址后去掉 172.17 和 127.0.0.1 部分的地址后，优先选择 192.168 、10.0 、172.16 获得的。 追加了一个主页地址，用来在没有 NTGR 路由器的时候，测试客户端。 使用主页地址的话，SOAP包是发往主页所在的服务器，随机返回 Response Code</p>
<p>3-2. Password 默认是 password， 如果更改过，下一次启动软件会是上一次关闭前的值。</p>
<p>3-3. 自动发送登陆 API 和自动发送 ConfigurationStarted/Finished 会在每一个 SOAP 请求前后都发送。 如果勾选了自动发送认证 API，在密码变化的时候，会发送认证 API 去检测密码是否准确。</p>
<p>3-4. 在 IP 有变动的时候，软件会自动请求 currentsetting.htm 页面和发送 GetInfo API 去更新右边的板子信息 （GetInfo API 不需要验证登陆），所以请注意右边信息是否完整。这是软件能否连接到板子的标志。</p>
<p>3-5. 如果右侧 Login Method 没有大于等于 2.0 ，SOAPLogin 和 SOAPLogin 按钮不能使用。 在 SOAPLogin 登陆成功后，会在 SOAP 选项页面追加或者替换 Cookie HTTP 头。 在 Logout 之后会删除这个 Cookie。</p>
<p>3-6. Serial Number 和 Firmware Version 通过 GetInfo API 获取，其余信息通过 currentsetting.htm 页面获取。</p>
</li>
<li>
<p><strong>发送SOAP请求</strong></p>
<p><img src="/server/image/soap-option.png" /></p>
<p>4-1. 构造 SOAP 请求。删除 method 和 action 输入框，会出现列表可以选择。选择 method 后，action 列表会跟着变动。选择完 action 之后，这个 API 所需要的参数会自动在右边列出。</p>
<p>4-2. 你可以自己指定各项参数，如果这个 API 返回的 Response Code 是 0 的话，那软件会存下 method、action 和 所需参数的对应关系，供下次可以选择使用。</p>
<p><img src="/server/image/response.png" /></p>
<p>4-3. 默认显示的结果是经过格式化显示的，在右上角的左边按钮可以切换显示原始结果和格式化结果。</p>
<p>4-4. 在右上角右边按钮可以复制当前的显示结果。</p>
<p><img src="/server/image/http-detail.png" /></p>
<p>4-5. HTTP Details 左边显示了这个请求耗时，具体到每个步骤。一个请求的timeout时间是在基本设置页面设置的 timeout 时间。</p>
<p>4-6. HTTP Details 右边分块显示了HTTP请求头和请求主体，还有返回数据的请求头和请求主体</p>
<p><img src="/server/image/parse-raw.png" /></p>
<p>4-7. 在 RAW 页可以贴入从历史记录拷贝或者从其他抓包软件拷贝过来的 SOAP 请求报文 （不要贴响应报文），软件会尽量解析报文，将 HTTP 头，SOAP method、 action 和 参数值都填到选项页里去，这样你就可以重新发送拷贝的报文。</p>
</li>
<li>
<p><strong>历史记录</strong></p>
<p><img src="/server/image/logs.png" /></p>
<p>5-1. 历史记录页面按照时间显示了以前发送过的 SOAP 请求。一次显示 15 条。在滚动条到达地步的时候继续拉动，会动态显示更多条目。</p>
<p>5-2. 记录可以展开显示每个记录的详细信息。</p>
<p>5-3. Response Code 如果是 0，则为绿色背景，如果是以 4 或者 5开头，说明是个出错的报文，则为红色背景，其余情况为橙色背景</p>
<p>5-4. Cost Time 可以按照大小排序。</p>
<p>5-5. 每条记录可以删除。</p>
<p>5-6. 如果点击 Resend 按钮，那么页面会跳到发送构造 SOAP 发送请求的页面。并且根据历史纪录来填写 method、action、SOAP Header 和所需参数，同时也会清除上一次请求的信息。</p>
</li>

<p><b>选择几条历史记录，选择将要保存到哪个文件夹，可以将记录导出成具有漂亮格式的 PDF 报告，也可以生成 TXT 文档。 成功导出记录后软件会打开保存的路径并选中导出的文件。</b></p>
<p><img src="/server/image/pdf-reporter.png" /></p>

<li>
<p><strong>版本信息</strong></p>
<p><img src="/server/image/app-version.png" /></p>
<p>6-1. 这个页面展示了当前软件的版本信息。如果有使用上的问题和建议意见从右上角那里的按钮进去提交给作者。</p>
<p>6-2. 如果有新版本，可以点击 Homepage 用浏览器打开此页面下载新版本。在每次进入这个页面的时候软件会自动检查，你也可以手动点击 Check Update 按钮检查版本。</p>
<p>6-3. 可以一次性将所有历史记录删除</p>
<p>6-4. Reset 按钮将会将软件恢复到默认的设置，包括你发送过的新加的 SOAP method、 action记录，不需要重新启动。</p>
<p>6-2. 选择旧版本的根目录文件夹后，可以将历史记录导入到当前软件</p>
<p>6-2. 选择旧版本的根目录文件夹后，可以将 SOAP 列表导入到当前软件</p>
</li>
</ol>
<hr />
<p>历史更新记录：</p>
<blockquote>
<p>1.0.1 更新记录</p>
<ol>
<li>优化基本设置页面判断 IP 和密码的响应时间</li>
<li>保存基本设置页面的设置</li>
<li>历史记录添加 Response Time 的排序</li>
<li>历史记录添加删除按钮</li>
<li>历史记录添加导入数据到发送页面</li>
<li>历史记录添加 Response Code 0 和非 0 的颜色区分</li>
<li>添加检查新版本</li>
</ol>
</blockquote>