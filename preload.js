var moment = require('./moment.js');
const { clipboard } = require('electron')

const MAVEN_BASE_URL = "http://search.maven.org/solrsearch/select?q="

const GOOGLE_MAVEN_BASE_URL = "https://dl.google.com/dl/android/maven2/"

var googleMavenCache = []

/**
 * 
 * get 请求
 * @param {*} options 
 */
function ajax(options) {
    var url = options.url
    var ajax = new XMLHttpRequest();
    ajax.open('get', url);
    ajax.send();
    ajax.onreadystatechange = function () {
        if (ajax.readyState == 4 && ajax.status == 200) {
            options.success && options.success(ajax.responseText)
        }
    }
}

/**
 * Return all keys in an object, sorted.
 */
var objectKeySorted = function objectKeySorted(object) {
    var keys = Object.keys(object);
    keys.sort();
    return keys;
};

/**
 * Convert master/group XML to js object. Only converts up to 2 levels of
 * elements. Only converts the "versions" attribute on the 2nd level
 * elements.
 *
 * Example 1:
 *
 * <com.android>
 *   <test versions="0.1,0.2"></test>
 * </com.android>
 *
 * Converts to:
 *
 * {
 *   "com.android": {
 *     "test": {
 *       "versions": "0.1,0.2"
 *     }
 *   }
 * }
 *
 * Example 2:
 *
 * <metadata>
 *   <com.android/>
 *   <com.google/>
 * </metadata>
 *
 * Converts to:
 *
 * {
 *   "metadata": {
 *      "com.android": null,
 *      "com.google": null
 *   }
 * }
 *
 * @param {string} xml The string form of xml snippet.
 * @return {!Object<string, *>} An object containing info converted from XML
 */
var xmlToJs = function xmlToJs(xml) {
    // Parse string
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xml, 'text/xml');
    // Document scope
    var docObj = {};
    // Root element
    var rootElement = xmlDoc.firstChild;
    var rootObj = {};
    docObj[rootElement.localName] = rootObj;

    for (var i in rootElement.children) {
        var subElement = rootElement.children.item(i);
        if (subElement.hasAttribute('versions')) {
            rootObj[subElement.localName] = {
                _versions: subElement.getAttribute('versions')
            };
        } else {
            rootObj[subElement.localName] = null;
        }
    }

    return docObj;
};


/**
* Downloads the group-index.xml corresponding to groupId, and create a
* GroupNode with the extracted information, asyncronously.
*
* @param {string} groupId The groupId to be loaded.
* @return {!Array<Promise<undefined>|!GroupNode>} A 2-element array. The
*     1st element is a promise that resolves when the process finishes. The
*     2nd element is a GroupNode, which will be fully populated when the
*     returned promise is resolved.
*/
var loadGroup = function loadGroup(groupId) {
    var groupIndexUrl =
        GOOGLE_MAVEN_BASE_URL + groupId.replace(/\./g, '/') + '/group-index.xml';
    ajax({
        url: groupIndexUrl,
        success: function (data) {
            var groupArtifacts = xmlToJs(data)[groupId];
            var artifactIds = objectKeySorted(groupArtifacts);
            for (var i in artifactIds) {
                var artifactId = artifactIds[i];
                var versions =
                    groupArtifacts[artifactId]['_versions'].split(',');
                // console.log(groupId + ":" + artifactId + ":" + versions.pop());
                googleMavenCache.push({
                    title: groupId + ":" + artifactId + ":" + versions.pop()
                })
            }
        }
    })
}

/**
 * google search
 */
var onGoogleSearch = function () {
    //清空cache
    googleMavenCache = [];
    ajax({
        url: GOOGLE_MAVEN_BASE_URL + 'master-index.xml',
        success: function (data) {
            var groupIds = objectKeySorted(xmlToJs(data).metadata)
            for (var i in groupIds) {
                loadGroup(groupIds[i])
            }
        }
    })
}

var timeoutId = 0;

/**
 * maven search
 * @param {string} searchWord 查询关键词
 * @param {[]} callbackSetList 
 */
var onMavenSearch = function (searchWord, callbackSetList) {
    clearTimeout(timeoutId)
    //延迟搜索
    timeoutId = setTimeout(function () {
        ajax({
            url: MAVEN_BASE_URL + searchWord,
            success: function (data) {
                const items = JSON.parse(data).response.docs.map(item => {
                    return {
                        title: `${item.g}:${item.a}:${item.latestVersion}`,
                        description: `updated at ${moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}`
                    }
                })
                console.log(items);
                callbackSetList(items)
            }
        })
    }, 350);
};

/**
 * copy 结果
 * @param {*} itemData 
 */
var copyResult = function (itemData) {
    window.utools.hideMainWindow()
    const result = "implementation \"" + itemData.title + "\""
    clipboard.writeText(result, 'selection')
    window.utools.outPlugin()
}

// 在window上添加一个名称为“exports”的对象，用于描述插件的模版模式及设置回调
// 列表模式
window.exports = {
    "maven-search": { // maven search
        mode: "list",  // 列表模式
        args: {
            /*//进入插件时调用（可选）
            enter: (action, callbackSetList) => {
                // 如果进入插件就要显示列表数据
                onMavenSearch(action, "okhttp", callbackSetList)
            }, */
            // 子输入框内容变化时被调用 可选 (未设置则无搜索)
            search: (action, searchWord, callbackSetList) => {
                // 获取一些数据
                // 执行 callbackSetList 显示出来
                onMavenSearch(searchWord, callbackSetList)
            },
            // 用户选择列表中某个条目时被调用
            select: (action, itemData, callbackSetList) => {
                copyResult(itemData)
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "搜索（搜索结果点击可复制到剪贴板）"
        }
    },
    "google-maven": { // google maven search
        mode: "list",  // 列表模式
        args: {
            enter: (action, callbackSetList) => {
                //预加载数据
                onGoogleSearch()
            },
            // 子输入框内容变化时被调用 可选 (未设置则无搜索)
            search: (action, searchWord, callbackSetList) => {
                // 获取一些数据
                // 执行 callbackSetList 显示出来
                if (!searchWord) return callbackSetList()
                searchWord = searchWord.toLowerCase()
                return callbackSetList(googleMavenCache.filter(x => x.title.includes(searchWord)))
            },
            // 用户选择列表中某个条目时被调用
            select: (action, itemData, callbackSetList) => {
                copyResult(itemData)
            },
            // 子输入框为空时的占位符，默认为字符串"搜索"
            placeholder: "搜索（搜索结果点击可复制到剪贴板）"
        }
    }

}
