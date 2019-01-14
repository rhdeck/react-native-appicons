#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const cpp = require("child-process-promise");
const glob = require("glob");
const url = require("url");
const tmp = require("tmp");
const request = require("request");

const androidinfo = [
  {
    path: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png",
    height: 48,
    width: 48,
    roundTarget: "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png"
  },
  {
    path: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
    height: 72,
    width: 72,
    roundTarget: "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png"
  },
  {
    path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
    height: 96,
    width: 96,
    roundTarget: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png"
  },
  {
    path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
    height: 144,
    width: 144,
    roundTarget: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png"
  },
  {
    path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    height: 192,
    width: 192,
    roundTarget: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"
  }
];
function resize(source, target, width, height) {
  if (!height) height = width;
  if (!source || !target || !width) {
    console.log(
      "Bad arguments passed to resize",
      source,
      target,
      width,
      height
    );
    return;
  }
  const geometryold = parseInt(width) + "x" + parseInt(height);
  const geometry = geometryold + "^";
  return new Promise((resolve, reject) => {
    cpp
      .spawn("/usr/bin/env", [
        "convert",
        source,
        "-resize",
        geometry,
        "-gravity",
        "center",
        "-extent",
        geometryold,
        target
      ])
      .then(
        () => {
          resolve(target);
        },
        error => {
          reject("Could not create the appropriate icon file", target, error);
        }
      );
  });
}
function makeRound(source, target, width, height) {
  const halfWidth = (width / 2 - 1).toFixed(0);
  const halfHeight = (height / 2 - 1).toFixed(0);
  const cloneString = `\\( +clone -threshold -1 -negate -fill white -draw "circle ${halfWidth},${halfHeight} ${halfWidth},0" \\)`;
  const commandLine = `/usr/bin/env convert ${source} -respect-parentheses ${cloneString} -alpha off -compose copy_opacity -composite ${target}`;
  return new Promise((resolve, reject) => {
    cpp.exec(commandLine, { stdio: "inherit" }).then(
      () => {
        resolve(target);
      },
      error => {
        console.error("Could not create the round icon file", target, error);
        resolve(null);
      }
    );
  });
}
var contentsJSON = null;
function getContents() {
  if (contentsJSON) return contentsJSON;
  const cwd = fs.realpathSync(__dirname);
  const contentsPath = path.join(cwd, "Contents.json");
  if (fs.existsSync(contentsPath)) {
    const str = fs.readFileSync(contentsPath);
    contentsJSON = JSON.parse(str);
    return contentsJSON;
  } else {
    return null;
  }
}
var cachedImagePath = null;
function getImagePath() {
  if (cachedImagePath) return cachedImagePath;
  const iosDir = path.join(process.cwd(), "ios");
  const imageDir = glob.sync(path.join(iosDir, "*", "Images.xcassets"))[0];
  if (!imageDir) return null;
  const AppIconDir = path.join(imageDir, "AppIcon.appiconset");
  if (!fs.existsSync(AppIconDir)) {
    fs.mkdirSync(AppIconDir);
  }
  cachedImagePath = AppIconDir;
  return cachedImagePath;
}
function getPackagePath() {
  return process.cwd() + "/package.json";
}
function getPackage() {
  const packagePath = getPackagePath();
  if (!fs.existsSync(packagePath)) {
    console.log(
      "This does not appear to be a valid directory. Try running from your project root"
    );
    process.exit();
  }
  var package = require(packagePath);
  return package;
}
var imagestart = null;
function loadImage() {
  if (imagestart) return imagestart;
  imagestart = getPackage().appIcon;
  if (!imagestart) {
    console.log('There us no appicon specified. Run "react-native setappicon"');
    process.exit();
  }
  let uri;
  try {
    uri = new url.URL(imagestart);
  } catch (e) {}
  return new Promise((resolve, reject) => {
    if (uri && uri.protocol.length) {
      //Get the damn file
      const tmppath = tmp.fileSync().name;
      const bn = path.basename(uri.pathname);
      const p = tmppath + "_" + bn;
      request.get(imagestart, { encoding: null }, (e, r, b) => {
        if (e) {
          reject("Got an error: " + e);
          return;
        }
        if (b) {
          fs.writeFileSync(p, b);
          resolve(p);
          return;
        } else {
          reject("There was no data there");
        }
      });
    } else {
      const realpath = fs.realpathSync(imagestart);
      if (fs.existsSync(realpath)) {
        resolve(realpath);
      } else {
        reject(imagestart + " does not appear to exist");
      }
    }
  });
  return imagestart;
}
var contents = getContents();
if (!contents) {
  console.log("Could not find Contents.json file, aborting");
  process.exit();
}
loadImage().then(
  imagepath => {
    androidinfo.map(obj => {
      const rp = fs.realpathSync(
        path.join(process.cwd(), ...obj.path.split("/"))
      );
      if (fs.existsSync(rp) || fs.existsSync(path.dirname(rp))) {
        resize(imagepath, rp, obj.width, obj.height).then(
          target => {
            const newRP = fs.realpathSync(
              path.join(process.cwd(), ...obj.roundTarget.split("/"))
            );
            makeRound(target, newRP, obj.width, obj.height);
          },
          () => {
            console.log(
              "This module requires imagemagick to run. \nTo install on MacOS:\n port install imagemagick\n -OR-\n brew install imagemagick\n\nOn Linux, try aptitude:\n apt-get install imagemagick"
            );
            process.exit();
          }
        );
      }
    });
    console.log("Successfully created Android application icons");
    contents.images = contents.images.map(obj => {
      const hw = obj.size.split("x");
      const scale = parseInt(obj.scale.substring(0, obj.scale.length - 1));
      const width = hw[0] * (scale ? scale : 1);
      const height = hw[1] * (scale ? scale : 1);
      if (!obj.filename)
        obj.filename = "icon_" + obj.idiom + width + "x" + height + ".png";
      target = path.join(getImagePath(), obj.filename);
      try {
        fs.unlinkSync(target);
      } catch (err) {}
      resize(imagepath, target, width, height).then(
        target => {},
        () => {
          console.log(
            "This module requires imagemagick to run. \nTo install on MacOS:\n port install imagemagick\n -OR-\n brew install imagemagick\n\nOn Linux, try aptitude:\n apt-get install imagemagick"
          );
          process.exit();
        }
      );
      return obj;
    });
    const contentsPath = path.join(getImagePath(), "Contents.json");
    fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));
    console.log("Successfully created iOS application icons");
  },
  errormessage => {
    console.log("Could not load the starting image", errormessage);
    process.exit();
  }
);
