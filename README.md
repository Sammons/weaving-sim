
The file layout here is 
- /built (where typescript puts js files, not used by webpack but handy nonetheless)
- /dist (where webpack puts bundles, these are what people run when they load the page)
- /node_modules (where npm puts libraries, code we depend on)
- /static (source files that don't change much and aren't javascript/typescript e.g. index.html)
- /webpack (configuration for the bundler which)