const cp = require ('child_process')
const fs = require ('fs')
const path = require('path')

const ffmpeg = `docker run --rm -v ${process.cwd()}/video:/video jrottenberg/ffmpeg`

const run = command => {
  console.log(command)
  cp.execSync(command)
}

function chapterer (chapters) {
  return chapters.map(chapter => `
[CHAPTER]
TIMEBASE=1/1000
START=${chapter.start_time * 1000}
END=${chapter.end_time * 1000}
title=${chapter.title}
`).join('')
}

const handleChapters = (jsoninfoFile) => {
  const ffmetaFile = jsoninfoFile.replace('.info.json', '.ffmeta')
  if (fs.existsSync(ffmetaFile)) {
    return console.log('Skipping existing', ffmetaFile)
  }
  const jsonInfo = JSON.parse(fs.readFileSync(jsoninfoFile).toString())
  const videoFile = jsoninfoFile.replace('.info.json', `.${jsonInfo.ext}`)
  const tmpVideoFile = jsoninfoFile.replace('.info.json', `2.${jsonInfo.ext}`)

  console.log(`Found ${videoFile}`)

  const exportMetadataCommand = `${ffmpeg} -i "/${videoFile}" -f ffmetadata "/${ffmetaFile}"`
  run(exportMetadataCommand)

  const ffmetaFileContent = `${fs.readFileSync(ffmetaFile).toString()}\n\n${chapterer(jsonInfo.chapters || [])}`
  fs.writeFileSync(ffmetaFile, ffmetaFileContent)

  const setMetadataCommand = `${ffmpeg} -i "/${videoFile}" -i "/${ffmetaFile}" -map_metadata 1 -codec copy "/${tmpVideoFile}"`
  run(setMetadataCommand)

  run(`rm "${videoFile}"`)
  run(`mv "${tmpVideoFile}" "${videoFile}"`)
}

const find = (startPath, filter) => {
  if (!fs.existsSync(startPath)) {
    console.log("no dir ", startPath)
    return
  }

  const files = fs.readdirSync(startPath)
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i])
    const stat = fs.lstatSync(filename)

    if (stat.isDirectory()) {
      find(filename, filter)
    } else if (filename.endsWith(filter)) {
      handleChapters(filename)
    }
  }
}

find('./video', '.info.json')
