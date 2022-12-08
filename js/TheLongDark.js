$('#background').hide();
$('#background img').attr("src", "/background/TheLongDark/" + RandomNum(0, 4) + ".jpg")
function buckground_load() {
    console.log('图片加载完成');
    $('#background').show(1500);
}

function RandomNum(Min, Max) {
    var Range = Max - Min;
    var Rand = Math.random();
    var num = Min + Math.floor(Rand * Range); //舍去
    return num;
}

fetch('./api/item.json').then((response) => response.json())
    .then((json) => {
        var item = json.item
        for (const key in item) {
            var focus = item[key]
            if (focus.status < 2) {
                $('.item.welcome').append(
                    generate(focus.title, focus.author, focus.update, focus.game_ver, focus.load_ver, focus.detailed, focus.dependence == "undefined" ? null : focus.dependence)
                )
            }
        }
    });
/*  */

function generate(title, author, update, version, position, introduction, dependence) {
    var html = `
    <div class="itemui" style="padding: 20px 30px;text-align: left;border-top: 1px solid #000000;">
        <div>
            <div class="inline title">${title}</div>
            <div class="inline small">作者</div>
            <div class="inline small name">${author}</div>
            <br>
            <div class="inline small" style="color: darkblue;">${update}</div>
            <div class="inline small"> | </div>
            <div class="inline small" style="color:brown;">游戏版本 ${version}</div>
            <div class="inline small"> | </div>
            <div class="inline small" style="color: indigo;">前置插件 ${position}</div>
            <br>
            <div style="padding-top: 4px;border-top: 1px solid #606160;margin-top: 2px;"></div>
            <div class="inline small introduction">${introduction}</div>
            <br>
            <div style="padding-top: 8px;">
            ${!!dependence ? `<div class="inline small introduction" style="color: brown;">模组依赖:</div>` : ""}
            ${!!dependence ? `<div class="inline small introduction" style="color: royalblue;">${dependence}</div>` : ""}
            </div>
        </div>
    </div>`
    return html
}