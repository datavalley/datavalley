$(document).ready(function(){
    (function(){
        function initHeading(){
            var h2 = [];
            var h3 = [];
            var h2index = 0;
            $.each($('h2,h3'),function(index,item){
                if(item.tagName.toLowerCase() == 'h2'){
                    var h2item = {};
                    h2item.name = $(item).text();
                    h2item.id = 'menuIndex'+index;
                    h2.push(h2item);
                    h2index++;
                }else{
                    var h3item = {};
                    h3item.name = $(item).text();
                    h3item.id = 'menuIndex'+index;
					if(h2index-1<0){
						alert('2货别在使用h2标签之前使用h3标签');
					}
                    if(!h3[h2index-1]){
                        h3[h2index-1] = [];
                    }
                    h3[h2index-1].push(h3item);
                }
                item.id = 'menuIndex' + index;
            });
            return {h2:h2,h3:h3}
        }

        function genTmpl(){
            var tmpl = '<ul>';

            var heading = initHeading();
            var h2 = heading.h2;
            var h3 = heading.h3;

            for(var i=0;i<h2.length;i++){
                tmpl += '<li><a href="#" data-id="'+h2[i].id+'">'+h2[i].name+'</a></li>';

                if(h3[i]){
                    for(var j=0;j<h3[i].length;j++){
                        tmpl += '<li class="h3"><a href="#" data-id="'+h3[i][j].id+'">'+h3[i][j].name+'</a></li>';
                    }
                }
            }
            tmpl += '</ul>';

            return tmpl;
        }

        function getIndex(){
            var tmpl = genTmpl();
            var indexCon = '<div id="menuIndex" class="sidenav" ></div>';
            var directory = '<div id="directoryTile" class="sidenav"><ul><li style="list-style-type:none;"><h2>目录<h2></li></ul></div>';

            $('#content').append(directory);
            $('#content').append(indexCon);

            $('#menuIndex')
                .append($(tmpl))
                .delegate('a','click',function(e){
                    var selector = $(this).attr('data-id') ? '#'+$(this).attr('data-id') : 'h1'
                    var scrollNum = $(selector).offset().top;
					//console.log(scrollNum);
                    $('body, html').animate({ scrollTop: scrollNum - 15 }, 500, 'linear');
                });
        }

        if($('h2').length >= 2){
            getIndex();
            $("#menuIndex").hide();
            $("#directoryTile").hide();
			$(window).scroll(function () {
				if ($(this).scrollTop() > 50) {
				  $('#menuIndex').fadeIn();
                  $("#directoryTile").fadeIn();
				} else {
				  $('#menuIndex').fadeOut();
                  $("#directoryTile").fadeOut();
				}
				$('#menuIndex').css("top",150);
                $('#menuIndex').css("height",600);
                $('#menuIndex').css("overflow-y","auto");
			});
        }
    })();
});
