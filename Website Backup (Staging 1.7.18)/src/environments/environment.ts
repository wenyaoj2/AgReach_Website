// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  firebase: {
      apiKey: "AIzaSyB5BpUKULqzsLH0dSIP3vB202iP9t7sqiE",
      authDomain: "agreach-6a5ee.firebaseapp.com",
      databaseURL: "https://agreach-6a5ee.firebaseio.com",
      projectId: "agreach-6a5ee",
      storageBucket: "agreach-6a5ee.appspot.com",
      messagingSenderId: "397559641053"
  }
};
