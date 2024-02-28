// import postcss from 'postcss';
// import sass from 'sass';
const postcss = require('postcss');
const sass = require('sass');

return postcss([])
    .process(sass.compile('./testfiles.scss').css)
    .then((res) => {
        const result = res.toString();
        console.log(result);
    });
