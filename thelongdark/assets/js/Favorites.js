class FavoritesModal {
    constructor() {
        this.modalId = 'favoritesModal';
        this.wrapperClass = 'favorites-modal-wrapper';
        this.injectModalHTML();
    }

    injectModalHTML() {
        if (document.getElementById(this.modalId)) return;

        const modalHTML = `
            <div class="${this.wrapperClass}" id="${this.modalId}">
                <div class="modal-overlay"></div>
                <div class="favorites-modal">
                <div class="modal-header">
                    <h2>收藏的项目</h2>
                    <span class="modal-close">✕</span>
                </div>
                <div class="favorites-mod-list" id="favoritesModList"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById(this.modalId);
        modal.querySelector('.modal-overlay').addEventListener('click', () => this.hide());
        modal.querySelector('.modal-close').addEventListener('click', () => this.hide());

        if (!document.getElementById('favoritesModalStyle')) {
            const style = document.createElement('style');
            style.id = 'favoritesModalStyle';
            style.textContent = `
                .${this.wrapperClass} {
                display: none;
                justify-content: center;
                align-items: center;
                position: fixed;
                top: 0; left: 0;
                width: 100vw;
                min-height: 100vh;
                z-index: 21000;
                background: rgba(0,0,0,0.5);
                }
                .${this.wrapperClass}.active {
                display: flex;
                }
                .${this.wrapperClass} .favorites-modal {
                position: relative;
                background-color: #2E3632;
                padding: 0;
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                border-radius: 5px;
                border: 3px solid #f57c1d;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                }
                .${this.wrapperClass} .modal-header {
                position: sticky;
                top: 0;
                background-color: #2E3632;
                padding: 20px 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #f57c1d;
                z-index: 10;
                }
                .${this.wrapperClass} .modal-header h2 {
                color: #f57c1d;
                margin: 0;
                font-weight: normal;
                font-size: 1.5em;
                }
                .${this.wrapperClass} .modal-close {
                cursor: pointer;
                color: #f57c1d;
                font-size: 1.5em;
                user-select: none;
                }
                .${this.wrapperClass} #favoritesModList {
                padding: 15px 30px;
                overflow-y: auto;
                flex: 1;
                scrollbar-width: none;
                -ms-overflow-style: none;
                }
                .${this.wrapperClass} #favoritesModList::-webkit-scrollbar {
                display: none;
                }
                .${this.wrapperClass} .mod-item {
                position: relative;
                background-color: #1c1c1e;
                padding: 15px;
                padding-bottom: 60px;
                margin-bottom: 10px;
                border-radius: 5px;
                transition: all 200ms ease-out;
                display: flex;
                flex-direction: column;
                min-height: 120px;
                }
                .${this.wrapperClass} .mod-item:hover {
                background-color: #46524c;
                }
                .${this.wrapperClass} .mod-name {
                font-weight: bold;
                font-size: 1.1em;
                margin-bottom: 8px;
                }
                .${this.wrapperClass} .mod-description {
                font-style: normal;
                color: #ccc;
                margin-bottom: 12px;
                }
                .${this.wrapperClass} .mod-author,
                .${this.wrapperClass} .mod-categories,
                .${this.wrapperClass} .mod-status {
                font-size: 0.9em;
                margin-bottom: 5px;
                }
                .${this.wrapperClass} .mod-usedby {
                font-weight: bold;
                color: #8fc891;
                font-size: 0.9em;
                margin-top: 5px;
                }
                .${this.wrapperClass} .mod-download-btn {
                position: absolute;
                bottom: 15px;
                right: 15px;
                padding: 8px 15px;
                background-color: #f57c1d;
                color: #0c0c0c;
                border: none;
                border-radius: 3px;
                font-size: 0.9em;
                cursor: pointer;
                user-select: none;
                transition: background-color 0.2s ease-out;
                white-space: nowrap;
                }
                .${this.wrapperClass} .mod-download-btn:hover {
                background-color: #ffbd02;
                }
            `;
            document.head.appendChild(style);
            $("#favoritesModal").click((e) => {
                if (e.target.id == "favoritesModal") {
                    this.hide()
                }
            })
        }
    }

    getFavoritesAndDependencies() {
        const favoritesStr = localStorage.getItem('favorites');
        const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];
        const dependencies = [];

        for (const fav of favorites) {
            const data = srcData[fav];
            if (data && data.Dependencies) {
                for (const dep of data.Dependencies) {
                    if (!dependencies.includes(dep) && dep in srcData) {
                        dependencies.push(dep);
                    }
                }
            }
        }

        return [...new Set([...dependencies, ...favorites])];
    }

    getModUsedByMap(modList) {
        const usedByMap = {};
        for (const modKey of modList) {
            const mod = srcData[modKey];
            if (!mod?.Dependencies) continue;
            for (const dep of mod.Dependencies) {
                if (!usedByMap[dep]) usedByMap[dep] = [];
                usedByMap[dep].push(mod.Name);
            }
        }
        return usedByMap;
    }

    populateFavoritesModal(modList) {
        const modListContainer = document.getElementById('favoritesModList');
        if (!modListContainer) return;
        modListContainer.innerHTML = '';

        if (modList.length === 0) {
            modListContainer.innerHTML = '<p>暂无收藏或前置模组。</p>';
            return;
        }

        const usedByMap = this.getModUsedByMap(modList);

        modList.forEach(mod_id => {
            const model_info = srcData[mod_id];
            if (!model_info) return;

            const modItem = document.createElement('div');
            modItem.className = 'mod-item';

            modItem.innerHTML = `
                <div class="mod-name">${model_info.Name}</div>
                <div class="mod-description">${model_info.Description || ''}</div>
                <div class="mod-author">作者：${model_info.Author}</div>
                <div class="mod-categories">分类：${model_info.Categories.join(', ')}</div>
                <div class="mod-status">状态：${model_info.Status.working ? '正常工作' : '存在问题'}</div>
            `;

            if (usedByMap[mod_id]) {
                const usedBy = document.createElement('div');
                usedBy.className = 'mod-usedby';
                usedBy.textContent = `被以下模组使用：${usedByMap[mod_id].join(', ')}`;
                modItem.appendChild(usedBy);
            }

            if (model_info.Download?.browser_download_url) {
                const btn = document.createElement('button');
                btn.className = 'mod-download-btn';
                btn.textContent = '下载';
                btn.addEventListener('click', ((mod_id) => {
                    return function (e) {
                        e.stopPropagation();
                        var url = model_info.Download.browser_download_url;
                        if (mod_id in isHanified) { // 通过模组更新日期判断是否为过期汉化版，如果为则...
                            if (confirm("该模组存在汉化版本，是否下载汉化版本？")) {
                                url = isHanified[mod_id]["Download"]
                            }
                        }
                        window.open(url, '_blank');
                        e.target.textContent = "已下载"
                    }
                })(mod_id));
                modItem.appendChild(btn);
            }

            modListContainer.appendChild(modItem);
        });
    }

    show() {
        const modList = this.getFavoritesAndDependencies();
        this.populateFavoritesModal(modList);
        document.getElementById(this.modalId)?.classList.add('active');
    }

    hide() {
        document.getElementById(this.modalId)?.classList.remove('active');
    }
}
