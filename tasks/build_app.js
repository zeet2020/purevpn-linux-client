const gulp = require('gulp');
const less = require('gulp-less');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const jetpack = require('fs-jetpack');
const bundle = require('./bundle');
const utils = require('./utils');

const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const destDir = jetpack.cwd('./app');

gulp.task('bundle', () => {
  return Promise.all([
    bundle(srcDir.path('background.js'), destDir.path('background.js')),
    bundle(srcDir.path('app.js'), destDir.path('app.js'))
  ]);
});

gulp.task('css-copy', () => {
  return gulp.src(srcDir.path('css/**/*.css'))
  //.pipe(plumber())
  //.pipe(less())
  .pipe(gulp.dest(destDir.path('css')));
});

gulp.task('js-copy', () => {
  return gulp.src(srcDir.path('js/**/*.js'))
  //.pipe(plumber())
  //.pipe(less())
  .pipe(gulp.dest(destDir.path('js')));
});

gulp.task('environment', () => {
  const configFile = `config/env_${utils.getEnvName()}.json`;
  projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
});

gulp.task('copy-html',() => {
    srcDir.copy('index.html',destDir.path('app.html'),{ overwrite: true })
});

gulp.task('watch', () => {
  const beepOnError = (done) => {
    return (err) => {
      if (err) {
        utils.beepSound();
      }
      done(err);
    };
  };

  //watch('src/**/*.js', batch((events, done) => {
    //gulp.start('bundle', beepOnError(done));
  //}));
  //watch('src/css/**/*.css', batch((events, done) => {
    //gulp.start('less', beepOnError(done));
  //}));*/

});

gulp.task('build', ['bundle', 'css-copy','copy-html','js-copy','environment']);
