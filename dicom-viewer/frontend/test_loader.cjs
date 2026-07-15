const loader = require('@cornerstonejs/dicom-image-loader');
console.log(Object.keys(loader));
if (loader.default) {
  console.log('Default keys:', Object.keys(loader.default));
}
