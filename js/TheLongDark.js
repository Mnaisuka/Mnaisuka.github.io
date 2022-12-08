$('#background').hide();
$('#background img').attr("src", "/background/TheLongDark/" + RandomNum(0, 4) + ".jpg")
function buckground_load(){
    console.log('图片加载完成');
    $('#background').show(1500);
}

function RandomNum(Min, Max) {
    var Range = Max - Min;
    var Rand = Math.random();
    var num = Min + Math.floor(Rand * Range); //舍去
    return num;
}