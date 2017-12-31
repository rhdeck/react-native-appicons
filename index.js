const fs = require("fs");
const inquirer = require("inquirer");
const cp = require("child_process");
const url = require("url");
function getPackagePath() {
  return process.cwd() + "/package.json";
}
function getPackage() {
  const packagePath = getPackagePath();
  if (!fs.existsSync(packagePath)) {
    console.log(
      "This does not appear to be a valid directory. Try from your project root"
    );
    process.exit(1);
  }
  var package = require(packagePath);
  return package;
}
function writePackage(newPackage) {
  fs.writeFileSync(getPackagePath(), JSON.stringify(newPackage, null, 2));
}
function saveAppIconPath(path) {
  var package = getPackage();
  package.appIcon = path;
  writePackage(package);
}
module.exports = {
  name: "setappicon",
  description: "Identify the application icon URL or path for building",
  func: (argv, config, args) => {
    if (!argv || !argv[0]) {
      //It would be nice to pre-validate a
      inquirer
        .prompt({
          name: "pathorurl",
          default: getPackage().appIcon ? getPackage().appIcon : null,
          message:
            "What is the path or URL of the image you would like to base your application icons on? \n(should be big, ideally at least 1024x1024)",
          validate: answer => {
            answer = answer.trim();
            try {
              const u = new url.URL(answer);
              return true;
            } catch (err) {
              const rp = fs.realpathSync(answer);
              if (!fs.existsSync(rp)) {
                console.log("Could not validate the location", answer);
                return false;
              }
              return true;
            }
          }
        })
        .then(answers => {
          saveAppIconPath(answers.pathorurl);
          cp.spawn(
            "/usr/bin/env",
            ["node", "./node_modules/.bin/react-native-appicons"],
            { stdio: "inherit" }
          );
        });
    } else {
      saveAppIconPath(argv[0]);
      cp.spawn(
        "/usr/bin/env",
        ["node", "./node_modules/.bin/react-native-appicons"],
        {
          stdio: "inherit"
        }
      );
    }
  }
};
