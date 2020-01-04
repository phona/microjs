import assure from './src/assure'

const main = assure(
  function () {
    this.resolve(1)
  }
)

main
  .then(
    function (arg) {
      console.log("subassure1-1 called " + arg)
      this.resolve(2)
    }
  )
  .then(
    function(arg) {
      console.log("subassure1-2 called " + arg)
    }
  )

main
  .then(
    function (arg) {
      console.log("subassure2-1 called " + arg)
      this.resolve(3)
    }
  )
  .then(
    function (arg) {
      console.log("subassure2-2 called " + arg)
    }
  )
