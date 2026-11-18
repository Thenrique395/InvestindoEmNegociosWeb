const path = require('node:path');

// Mesmos plugins do builder Angular, com cobertura mínima bloqueante no CI.
module.exports = function (config) {
  const criticalModels = { statements: 90, branches: 80, functions: 90, lines: 90 };
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: path.join(__dirname, 'coverage/investindo-em-negocios-web'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'json-summary' }],
      check: {
        global: { statements: 50, branches: 40, functions: 42, lines: 52 },
        each: {
          overrides: {
            '**/dashboard/dashboard-{advice,categories,commitments,period,recurrences}.model.ts': criticalModels,
            '**/despesas/expense-list.model.ts': criticalModels,
          },
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadless'],
    restartOnFileChange: true,
  });
};
