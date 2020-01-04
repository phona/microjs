import assure from './src/assure'

const main = assure(function () {
  setTimeout(() => {
    console.log("call async function")
    this.resolve(1)
  }, 500)
}).then(function (arg) {
  setTimeout(() => {
    console.log("call second async function " + arg)
    this.resolve(2)
  }, 500)
}).then(function(arg) {
  setTimeout(() => {
    console.log("call third async function " + arg)
    try {
      throw new Error("Test");
      this.resolve(3)
    } catch(e) {
      this.reject(e)
    }
  }, 500)
}).then(arg => {
  console.log("end " + arg)
}).catch(err => {
  console.log(err)
});
