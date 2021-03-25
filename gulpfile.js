//Задает константы ///////////////////////////////////////////////////////////////////////////////////////////////////////
const { src, dest, watch, series, parallel } = require('gulp');
const scss = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const browsersync = require('browser-sync').create();
const group_media = require('gulp-group-css-media-queries');
const fileInclude = require('gulp-file-include');
const uglify = require('gulp-uglify-es').default;
const babel = require('gulp-babel');
const del = require('del');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const imagemin = require("gulp-imagemin");
const webp = require('gulp-webp');
const webphtml = require('gulp-webp-html');
const webpcss = require('gulp-webpcss');
const fonter = require('gulp-fonter');
const cssmin = require('gulp-cssmin');
let fs = require('fs');

//Подключаем автообновление браузера ///////////////////////////////////////////////////////////////////////////////////////////////////////
function browserSync() {
	browsersync.init({
		server: {
			baseDir: 'dist/'
		},
		port: 3000,
		notify: false
	});
}

//Следим за html, обрабатываем и выкидываем файлы в папку dist ///////////////////////////////////////////////////////////////////////////////////////////////////////
function html() {
	return src(['app/**/*.html', '!app/**/_*.html'])
		.pipe(fileInclude())
		.pipe(webphtml())//Этот плагин заменяет в html обычный тег img на конструкцию picture-source-img, для подключения формата webp в браузерах, которые его поддерживают.
		.pipe(dest('dist/'))
		.pipe(browsersync.stream())
}

//Следим за нашим файлом style.scss, конвертируем из него 2 файла css, один обычный, другой минифицированный и закидываем их в папку dist/css///////////////////////////////////////////////////////////////////////////////////////////////////////
function styles() {
	return src('app/scss/style.scss')
		.pipe(scss({
			outputStyle: 'expanded'
		}))
		.pipe(group_media())
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 5 version'],
			cascade: false,
			grid: true
		}))
		.pipe(webpcss())//Этот плагин устанавливают если нужно использование webp в свойстве background-image в scss, для него так же нужно в файл js добавить скрипт, определяющий поддержку браузером формата wepb.
		.pipe(dest('dist/css/'))
		.pipe(scss({
			outputStyle: 'compressed'
		}))
		.pipe(concat('style.min.css'))
		.pipe(dest('dist/css/'))
		.pipe(browsersync.stream())
}

//Следим за нашим файлом script.js, конвертируем из него 2 файла js, один обычный, другой минифицированный и закидываем их в папку dist/js///////////////////////////////////////////////////////////////////////////////////////////////////////
function scripts() {
	return src('app/js/**/*.js')
		.pipe(dest('dist/js/'))
		.pipe(babel({
			presets: ['@babel/env']
		}))
		.pipe(uglify())
		.pipe(concat('script.min.js'))
		.pipe(dest('dist/js/'))
		.pipe(browsersync.stream())
}

//Собираем все css файлы подключаемых плагинов, конкатинируем их в 1 минифицированный файл css и закидываем его в папку dist/css с именем libs.min.css///////////////////////////////////////////////////////////////////////////////////////////////////////
function stylesLibs() {
	return src([
		'node_modules/normalize.css/normalize.css'
	])
    .pipe(autoprefixer({
      overrideBrowserslist: ['last 5 version'],
      cascade: false,
      grid: true
    }))
    .pipe(cssmin())
		.pipe(concat('libs.min.css'))
		.pipe(dest('dist/css/'))
		.pipe(browsersync.stream())
}

//Собираем все js файлы подключаемых плагинов, конкатинируем их в 1 минифицированный файл js и закидываем его в папку dist/js с именем libs.min.js///////////////////////////////////////////////////////////////////////////////////////////////////////
function scriptsLibs() {
	return src([
		'node_modules/jquery/dist/jquery.js'
	])
		.pipe(uglify())
		.pipe(concat('libs.min.js'))
		.pipe(dest('dist/js/'))
		.pipe(browsersync.stream())
}

//Следим за всеми файлами jpg, png, svg, gif, ico, webp в папке app/img, конвертируем их в формат webp со сжатием в 70% и закидываем их в папку dist/img. Так же Оригинальные файлы сжимаем до 3 уровня из доступных 7(можно в функции этот параметр поменять) и отправляем сжатые оригиналы в папку dist/img. Все удаленные файлы в папке app/img удалятся из папки dist/img при следующем запуске gulp.///////////////////////////////////////////////////////////////////////////////////////////////////////
function images() {
	return src('app/img/**/*.{jpg,png,svg,gif,ico,webp}')
		.pipe(webp({
			quality: 70
		}))
		.pipe(dest('dist/img/'))
		.pipe(src('app/img/**/*.{jpg,png,svg,gif,ico,webp}'))
		.pipe(
			imagemin({
				progressive: true,
				svgoPlugins: [{ removeViewBox: false }],
				interlaced: true,
				optimizationLevel: 3 // 0 to 7
			})
		)
		.pipe(dest('dist/img/'))
		.pipe(browsersync.stream())
}

//Функция слежки за файлами. В данном случае следит за всеми файлами scss, html, js и изображениями в папке app в соответствующих подпапках.///////////////////////////////////////////////////////////////////////////////////////////////////////
function watching() {
	watch(['app/scss/**/*.scss'], styles);
	watch(['app/**/*.html'], html);
	watch(['app/js/**/*.js'], scripts);
	watch(['app/img/**/*.{jpg,png,svg,gif,ico,webp}'], images);
}

//Функция удаления папки dist. Срабатывает при каждом запуске gulp, перед всеми функциями.///////////////////////////////////////////////////////////////////////////////////////////////////////
function clear() {
	return del('dist/');
}

//Конвертация и подключение шрифтов.///////////////////////////////////////////////////////////////////////////////////////////////////////
function fonts() {
	//Данная функция конвертирует шрифты ttf в woff и woff2, Ее необходимо один раз запустить перед запуском проекта, затем запустить функцию gulp fontsStyle, и только после этого запустить gulp. Повторно этого делать не нужно, только в случае, если добавились новые шрифты.
	src('app/fonts/*.ttf')
		.pipe(ttf2woff())
		.pipe(dest('dist/fonts/'));
	return src('app/fonts/*.ttf')
		.pipe(ttf2woff2())
		.pipe(dest('dist/fonts/'));
};

function otf2ttf() {
	//Данная функция не подключена, так как нужна только в случае, если у тебя есть на руках шрифт в формате otf. Что бы воспользоваться ею нужно закинуть шрифт otf в папку app/fonts и в терминале написать gulp otf2ttf. Делать это необходимо перед запуском gulp.
	return src(['app/fonts/*.otf'])
		.pipe(fonter({
			formats: ['ttf']
		}))
		.pipe(dest('app/fonts/'))
}

function fontsStyle(params) {
	//Эта функция подключит шрифты с помощью миксинов в файл fonts.scss. При запуске появляется какое-то красное уведомление, я так и не смог понять че ему надо, но шрифты подключаются и все работает, хз. Ее необходимо запустить один раз после функции gulp fonts, затем нужно в файле fonts.scss изменить имя шрифта, удалив начертание и поменять числовое значение на нужное в зависимости от начертания шрифта. Например там будет так: @include font("Jura-Bold", "Jura-Bold", "400", "normal");, а нужно будет сделать так: @include font("Jura", "Jura-Bold", "700", "normal");. Это необходимо для того что бы подключать шрифт указывая только название семейства, а начертание устанавливать стандартно при помощи свойства font-weight. Всю процедуру конвертации и подключения шрифтов необходимо проделать 1 раз перед запуском gulp, и в дальнейшем этого делать не нужно, только если в проект добавится новый шрифт.
	let file_content = fs.readFileSync('app/scss/fonts.scss');
	if (file_content == '') {
		fs.writeFile('app/scss/fonts.scss', '', cb);
		return fs.readdir('dist/fonts/', function (err, items) {
			if (items) {
				let c_fontname;
				for (var i = 0; i < items.length; i++) {
					let fontname = items[i].split('.');
					fontname = fontname[0];
					if (c_fontname != fontname) {
						fs.appendFile('app/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
					}
					c_fontname = fontname;
				}
			}
		})
	}
}

function cb() {

}

//Включаем все в работу///////////////////////////////////////////////////////////////////////////////////////////////////////
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.otf2ttf = otf2ttf;
exports.images = images;
exports.html = html;
exports.styles = styles;
exports.stylesLibs = stylesLibs;
exports.scripts = scripts;
exports.scriptsLibs = scriptsLibs;
exports.watching = watching;
exports.browserSync = browserSync;
exports.clear = clear;


exports.default = series(clear, stylesLibs, scriptsLibs, styles, html, scripts, images, fonts, parallel(watching, browserSync));