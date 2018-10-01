# react-native-appicons

No more "targets" - easily apply beautiful app icons without ever opening XCode. Makes differentiating your in-development projects much easier without a lot of work!

# Usage

```
yarn add react-native-appicons --dev
react-native setappicon
```

Directives set will be saved in your package.json for easy replication in the future.

Any subsequent run on react-native link updates the library of application icons based on the source path or URL.

All the resizing is taken care of for you on a "fill" basis. So if your selected image is wider than it is tall, the sides get cropped off because that's how these images work.

Best practice is to select an image at least 1024x1024 in size for best presentation in the app store. But if it is the wrong size, this will take care of it.

**Note**: you can set the application icon to a URL, which makes it easy to select a nice-looking (or silly) application icon via a Google Images search or the like. Just get it via "copy image address/link" and paste into the command line above.

# Limitations

This is for iOS and Android apps only. No support for Windows.

# Dependencies

This requires imagemagick to be installed. If its missing, don't worry: the plugin will recommend how you might install it.
