import assure from './src/assure'

assure.wrap(
  function () {
    setTimeout(() => {
      this.resolve(1)
    }, 500)
  }
)
  .then(
    function (arg) {
      console.log(`call second function with ${arg}`)
      return assure.wrap(
        function () {
          console.log('call wrapped function')
          setTimeout(() => {
            this.resolve(2)
            console.log('call wrapped function')
          })
        }
      )
    }
  )
  .then((arg) => {
    console.log(arg)
  })
