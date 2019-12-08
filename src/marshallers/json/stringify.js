module.exports = {
  name: 'jsonStringify',
  desc: 'uses JSON.stringify and has the following additional options:\n\n-S, --spaces\nThe number of spaces used to format JSON. If it is set to 0 (default), the JSON is printed in a single line.    [number]\n\n-R, --replacer\nDetermines which JSON fields are kept. If it is set to null (default), all fields remain. See the documentation of JSON.stringify for details.                         [string]\n\n',
  func: (verbose, failEarly, argv) => {
    const spaces      = argv.S || argv.spaces   || 0
    const replacerStr = argv.R || argv.replacer || null
    const replacer    = eval(replacerStr)       || null

    return jsons => {
      let err = ''
      let str = ''

      for (let index = 0; index < jsons.length; index++) {
        try {
          const obj = jsons[index]
          str += JSON.stringify(obj, replacer, spaces) + '\n'
        } catch (e) {
          const info = verbose > 1 ? ' while marshalling:\n' + JSON.stringify(obj, null, 2) : ''
          err += e + info + '\n'
          if (failEarly) {
            process.stderr.write(err)
            process.exit(1)
          }
        }
      }

      return {err, str}
    }
  }
}