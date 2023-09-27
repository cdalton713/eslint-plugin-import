'use strict';var _path = require('path');var _path2 = _interopRequireDefault(_path);

var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);
var _isGlob = require('is-glob');var _isGlob2 = _interopRequireDefault(_isGlob);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);
var _importType = require('../core/importType');var _importType2 = _interopRequireDefault(_importType);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

var containsPath = function containsPath(filepath, target) {
  var relative = _path2['default'].relative(target, filepath);
  return relative === '' || !relative.startsWith('..');
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Enforce which files can be imported in a given folder.',
      url: (0, _docsUrl2['default'])('no-restricted-paths') },


    schema: [
    {
      type: 'object',
      properties: {
        zones: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              target: {
                anyOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: { type: 'string' },
                  uniqueItems: true,
                  minLength: 1 }] },



              from: {
                anyOf: [
                { type: 'string' },
                {
                  type: 'array',
                  items: { type: 'string' },
                  uniqueItems: true,
                  minLength: 1 }] },



              except: {
                type: 'array',
                items: {
                  type: 'string' },

                uniqueItems: true },

              message: { type: 'string' } },

            additionalProperties: false } },


        basePath: { type: 'string' } },

      additionalProperties: false }] },




  create: function () {function noRestrictedPaths(context) {
      var options = context.options[0] || {};
      var restrictedPaths = options.zones || [];
      var basePath = options.basePath || process.cwd();
      var currentFilename = context.getPhysicalFilename ? context.getPhysicalFilename() : context.getFilename();
      var matchingZones = restrictedPaths.filter(
      function (zone) {return [].concat(zone.target).
        map(function (target) {return _path2['default'].resolve(basePath, target);}).
        some(function (targetPath) {return isMatchingTargetPath(currentFilename, targetPath);});});


      function isMatchingTargetPath(filename, targetPath) {
        var mm = new RegExp(targetPath);
        return mm.test(filename);
      }

      function isValidExceptionPath(absoluteFromPath, absoluteExceptionPath) {
        var relativeExceptionPath = _path2['default'].relative(absoluteFromPath, absoluteExceptionPath);

        return (0, _importType2['default'])(relativeExceptionPath, context) !== 'parent';
      }

      function areBothGlobPatternAndAbsolutePath(areGlobPatterns) {
        return areGlobPatterns.some(function (isGlob) {return isGlob;}) && areGlobPatterns.some(function (isGlob) {return !isGlob;});
      }

      function reportInvalidExceptionPath(node) {
        context.report({
          node: node,
          message: 'Restricted path exceptions must be descendants of the configured `from` path for that zone.' });

      }

      function reportInvalidExceptionMixedGlobAndNonGlob(node) {
        context.report({
          node: node,
          message: 'Restricted path `from` must contain either only glob patterns or none' });

      }

      function reportInvalidExceptionGlob(node) {
        context.report({
          node: node,
          message: 'Restricted path exceptions must be glob patterns when `from` contains glob patterns' });

      }

      function computeMixedGlobAndAbsolutePathValidator() {
        return {
          isPathRestricted: function () {function isPathRestricted() {return true;}return isPathRestricted;}(),
          hasValidExceptions: false,
          reportInvalidException: reportInvalidExceptionMixedGlobAndNonGlob };

      }

      function computeGlobPatternPathValidator(absoluteFrom, zoneExcept) {
        var isPathException = void 0;

        var mm = new RegExp(absoluteFrom);
        var isPathRestricted = function () {function isPathRestricted(absoluteImportPath) {
            return mm.test(absoluteImportPath);
          }return isPathRestricted;}();
        var hasValidExceptions = zoneExcept.every(function () {return true;});

        if (hasValidExceptions) {
          var exceptionsMm = zoneExcept.map(function (except) {return new RegExp(except);});
          isPathException = function () {function isPathException(absoluteImportPath) {return exceptionsMm.some(function (mm) {return mm.test(absoluteImportPath);});}return isPathException;}();
        }

        var reportInvalidException = reportInvalidExceptionGlob;

        return {
          isPathRestricted: isPathRestricted,
          hasValidExceptions: hasValidExceptions,
          isPathException: isPathException,
          reportInvalidException: reportInvalidException };

      }

      function computeAbsolutePathValidator(absoluteFrom, zoneExcept) {
        var isPathException = void 0;

        var isPathRestricted = function () {function isPathRestricted(absoluteImportPath) {return containsPath(absoluteImportPath, absoluteFrom);}return isPathRestricted;}();

        var absoluteExceptionPaths = zoneExcept.
        map(function (exceptionPath) {return _path2['default'].resolve(absoluteFrom, exceptionPath);});
        var hasValidExceptions = absoluteExceptionPaths.
        every(function (absoluteExceptionPath) {return isValidExceptionPath(absoluteFrom, absoluteExceptionPath);});

        if (hasValidExceptions) {
          isPathException = function () {function isPathException(absoluteImportPath) {return absoluteExceptionPaths.some(
              function (absoluteExceptionPath) {return containsPath(absoluteImportPath, absoluteExceptionPath);});}return isPathException;}();

        }

        var reportInvalidException = reportInvalidExceptionPath;

        return {
          isPathRestricted: isPathRestricted,
          hasValidExceptions: hasValidExceptions,
          isPathException: isPathException,
          reportInvalidException: reportInvalidException };

      }

      function reportInvalidExceptions(validators, node) {
        validators.forEach(function (validator) {return validator.reportInvalidException(node);});
      }

      function reportImportsInRestrictedZone(validators, node, importPath, customMessage) {
        validators.forEach(function () {
          context.report({
            node: node,
            message: 'Unexpected path "{{importPath}}" imported in restricted zone.' + (customMessage ? ' ' + String(customMessage) : ''),
            data: { importPath: importPath } });

        });
      }

      var makePathValidators = function () {function makePathValidators(zoneFrom) {var zoneExcept = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var allZoneFrom = [].concat(zoneFrom);
          var areGlobPatterns = allZoneFrom.map(function () {return true;});

          if (areBothGlobPatternAndAbsolutePath(areGlobPatterns)) {
            return [computeMixedGlobAndAbsolutePathValidator()];
          }

          var isGlobPattern = areGlobPatterns.every(function (isGlob) {return isGlob;});

          return allZoneFrom.map(function (singleZoneFrom) {
            var absoluteFrom = _path2['default'].resolve(basePath, singleZoneFrom);

            if (isGlobPattern) {
              return computeGlobPatternPathValidator(absoluteFrom, zoneExcept);
            }
            return computeAbsolutePathValidator(absoluteFrom, zoneExcept);
          });
        }return makePathValidators;}();

      var validators = [];

      function checkForRestrictedImportPath(importPath, node) {
        var absoluteImportPath = (0, _resolve2['default'])(importPath, context);

        if (!absoluteImportPath) {
          return;
        }

        matchingZones.forEach(function (zone, index) {
          if (!validators[index]) {
            validators[index] = makePathValidators(zone.from, zone.except);
          }

          var applicableValidatorsForImportPath = validators[index].filter(function (validator) {return validator.isPathRestricted(absoluteImportPath);});

          var validatorsWithInvalidExceptions = applicableValidatorsForImportPath.filter(function (validator) {return !validator.hasValidExceptions;});
          reportInvalidExceptions(validatorsWithInvalidExceptions, node);

          var applicableValidatorsForImportPathExcludingExceptions = applicableValidatorsForImportPath.
          filter(function (validator) {return validator.hasValidExceptions && !validator.isPathException(absoluteImportPath);});
          reportImportsInRestrictedZone(applicableValidatorsForImportPathExcludingExceptions, node, importPath, zone.message);
        });
      }

      return (0, _moduleVisitor2['default'])(function (source) {
        checkForRestrictedImportPath(source.value, source);
      }, { commonjs: true });
    }return noRestrictedPaths;}() };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1yZXN0cmljdGVkLXBhdGhzLmpzIl0sIm5hbWVzIjpbImNvbnRhaW5zUGF0aCIsImZpbGVwYXRoIiwidGFyZ2V0IiwicmVsYXRpdmUiLCJwYXRoIiwic3RhcnRzV2l0aCIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwidHlwZSIsImRvY3MiLCJjYXRlZ29yeSIsImRlc2NyaXB0aW9uIiwidXJsIiwic2NoZW1hIiwicHJvcGVydGllcyIsInpvbmVzIiwibWluSXRlbXMiLCJpdGVtcyIsImFueU9mIiwidW5pcXVlSXRlbXMiLCJtaW5MZW5ndGgiLCJmcm9tIiwiZXhjZXB0IiwibWVzc2FnZSIsImFkZGl0aW9uYWxQcm9wZXJ0aWVzIiwiYmFzZVBhdGgiLCJjcmVhdGUiLCJub1Jlc3RyaWN0ZWRQYXRocyIsImNvbnRleHQiLCJvcHRpb25zIiwicmVzdHJpY3RlZFBhdGhzIiwicHJvY2VzcyIsImN3ZCIsImN1cnJlbnRGaWxlbmFtZSIsImdldFBoeXNpY2FsRmlsZW5hbWUiLCJnZXRGaWxlbmFtZSIsIm1hdGNoaW5nWm9uZXMiLCJmaWx0ZXIiLCJ6b25lIiwiY29uY2F0IiwibWFwIiwicmVzb2x2ZSIsInNvbWUiLCJ0YXJnZXRQYXRoIiwiaXNNYXRjaGluZ1RhcmdldFBhdGgiLCJmaWxlbmFtZSIsIm1tIiwiUmVnRXhwIiwidGVzdCIsImlzVmFsaWRFeGNlcHRpb25QYXRoIiwiYWJzb2x1dGVGcm9tUGF0aCIsImFic29sdXRlRXhjZXB0aW9uUGF0aCIsInJlbGF0aXZlRXhjZXB0aW9uUGF0aCIsImFyZUJvdGhHbG9iUGF0dGVybkFuZEFic29sdXRlUGF0aCIsImFyZUdsb2JQYXR0ZXJucyIsImlzR2xvYiIsInJlcG9ydEludmFsaWRFeGNlcHRpb25QYXRoIiwibm9kZSIsInJlcG9ydCIsInJlcG9ydEludmFsaWRFeGNlcHRpb25NaXhlZEdsb2JBbmROb25HbG9iIiwicmVwb3J0SW52YWxpZEV4Y2VwdGlvbkdsb2IiLCJjb21wdXRlTWl4ZWRHbG9iQW5kQWJzb2x1dGVQYXRoVmFsaWRhdG9yIiwiaXNQYXRoUmVzdHJpY3RlZCIsImhhc1ZhbGlkRXhjZXB0aW9ucyIsInJlcG9ydEludmFsaWRFeGNlcHRpb24iLCJjb21wdXRlR2xvYlBhdHRlcm5QYXRoVmFsaWRhdG9yIiwiYWJzb2x1dGVGcm9tIiwiem9uZUV4Y2VwdCIsImlzUGF0aEV4Y2VwdGlvbiIsImFic29sdXRlSW1wb3J0UGF0aCIsImV2ZXJ5IiwiZXhjZXB0aW9uc01tIiwiY29tcHV0ZUFic29sdXRlUGF0aFZhbGlkYXRvciIsImFic29sdXRlRXhjZXB0aW9uUGF0aHMiLCJleGNlcHRpb25QYXRoIiwicmVwb3J0SW52YWxpZEV4Y2VwdGlvbnMiLCJ2YWxpZGF0b3JzIiwiZm9yRWFjaCIsInZhbGlkYXRvciIsInJlcG9ydEltcG9ydHNJblJlc3RyaWN0ZWRab25lIiwiaW1wb3J0UGF0aCIsImN1c3RvbU1lc3NhZ2UiLCJkYXRhIiwibWFrZVBhdGhWYWxpZGF0b3JzIiwiem9uZUZyb20iLCJhbGxab25lRnJvbSIsImlzR2xvYlBhdHRlcm4iLCJzaW5nbGVab25lRnJvbSIsImNoZWNrRm9yUmVzdHJpY3RlZEltcG9ydFBhdGgiLCJpbmRleCIsImFwcGxpY2FibGVWYWxpZGF0b3JzRm9ySW1wb3J0UGF0aCIsInZhbGlkYXRvcnNXaXRoSW52YWxpZEV4Y2VwdGlvbnMiLCJhcHBsaWNhYmxlVmFsaWRhdG9yc0ZvckltcG9ydFBhdGhFeGNsdWRpbmdFeGNlcHRpb25zIiwic291cmNlIiwidmFsdWUiLCJjb21tb25qcyJdLCJtYXBwaW5ncyI6ImFBQUEsNEI7O0FBRUEsc0Q7QUFDQSxrRTtBQUNBLGlDO0FBQ0EscUM7QUFDQSxnRDs7QUFFQSxJQUFNQSxlQUFlLFNBQWZBLFlBQWUsQ0FBQ0MsUUFBRCxFQUFXQyxNQUFYLEVBQXNCO0FBQ3pDLE1BQU1DLFdBQVdDLGtCQUFLRCxRQUFMLENBQWNELE1BQWQsRUFBc0JELFFBQXRCLENBQWpCO0FBQ0EsU0FBT0UsYUFBYSxFQUFiLElB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NkJLLE9BQU9DLEtBQXBDLEVBQTJDRCxNQUEzQztBQUNELE9BRk0sRUFFSixFQUFDRSxVQUFVLElBQVgsRUFGSSxDQUFQO0FBR0QsS0F2S0QsT0FBaUJwRSxpQkFBakIsSUE1RGUsRUFBakIiLCJmaWxlIjoibm8tcmVzdHJpY3RlZC1wYXRocy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgcmVzb2x2ZSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL3Jlc29sdmUnO1xuaW1wb3J0IG1vZHVsZVZpc2l0b3IgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9tb2R1bGVWaXNpdG9yJztcbmltcG9ydCBpc0dsb2IgZnJvbSAnaXMtZ2xvYic7XG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJztcbmltcG9ydCBpbXBvcnRUeXBlIGZyb20gJy4uL2NvcmUvaW1wb3J0VHlwZSc7XG5cbmNvbnN0IGNvbnRhaW5zUGF0aCA9IChmaWxlcGF0aCwgdGFyZ2V0KSA9PiB7XG4gIGNvbnN0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSh0YXJnZXQsIGZpbGVwYXRoKTtcbiAgcmV0dXJuIHJlbGF0aXZlID09PSAnJyB8fCAhcmVsYXRpdmUuc3RhcnRzV2l0aCgnLi4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtZXRhOiB7XG4gICAgdHlwZTogJ3Byb2JsZW0nLFxuICAgIGRvY3M6IHtcbiAgICAgIGNhdGVnb3J5OiAnU3RhdGljIGFuYWx5c2lzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW5mb3JjZSB3aGljaCBmaWxlcyBjYW4gYmUgaW1wb3J0ZWQgaW4gYSBnaXZlbiBmb2xkZXIuJyxcbiAgICAgIHVybDogZG9jc1VybCgnbm8tcmVzdHJpY3RlZC1wYXRocycpLFxuICAgIH0sXG5cbiAgICBzY2hlbWE6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB6b25lczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgIG1pbkl0ZW1zOiAxLFxuICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHtcbiAgICAgICAgICAgICAgICAgIGFueU9mOiBbXG4gICAgICAgICAgICAgICAgICAgIHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZUl0ZW1zOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmcm9tOiB7XG4gICAgICAgICAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgICAgICAgICB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfSxcbiAgICAgICAgICAgICAgICAgICAgICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBtaW5MZW5ndGg6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXhjZXB0OiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgdW5pcXVlSXRlbXM6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiB7dHlwZTogJ3N0cmluZyd9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYmFzZVBhdGg6IHt0eXBlOiAnc3RyaW5nJ30sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uIG5vUmVzdHJpY3RlZFBhdGhzKGNvbnRleHQpIHtcbiAgICBjb25zdCBvcHRpb25zID0gY29udGV4dC5vcHRpb25zWzBdIHx8IHt9O1xuICAgIGNvbnN0IHJlc3RyaWN0ZWRQYXRocyA9IG9wdGlvbnMuem9uZXMgfHwgW107XG4gICAgY29uc3QgYmFzZVBhdGggPSBvcHRpb25zLmJhc2VQYXRoIHx8IHByb2Nlc3MuY3dkKCk7XG4gICAgY29uc3QgY3VycmVudEZpbGVuYW1lID0gY29udGV4dC5nZXRQaHlzaWNhbEZpbGVuYW1lID8gY29udGV4dC5nZXRQaHlzaWNhbEZpbGVuYW1lKCkgOiBjb250ZXh0LmdldEZpbGVuYW1lKCk7XG4gICAgY29uc3QgbWF0Y2hpbmdab25lcyA9IHJlc3RyaWN0ZWRQYXRocy5maWx0ZXIoXG4gICAgICAoem9uZSkgPT4gW10uY29uY2F0KHpvbmUudGFyZ2V0KVxuICAgICAgICAubWFwKCh0YXJnZXQpID0+IHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0KSlcbiAgICAgICAgLnNvbWUoKHRhcmdldFBhdGgpID0+IGlzTWF0Y2hpbmdUYXJnZXRQYXRoKGN1cnJlbnRGaWxlbmFtZSwgdGFyZ2V0UGF0aCkpLFxuICAgICk7XG5cbiAgICBmdW5jdGlvbiBpc01hdGNoaW5nVGFyZ2V0UGF0aChmaWxlbmFtZSwgdGFyZ2V0UGF0aCkge1xuICAgICAgY29uc3QgbW0gPSBuZXcgUmVnRXhwKHRhcmdldFBhdGgpO1xuICAgICAgcmV0dXJuIG1tLnRlc3QoZmlsZW5hbWUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWRFeGNlcHRpb25QYXRoKGFic29sdXRlRnJvbVBhdGgsIGFic29sdXRlRXhjZXB0aW9uUGF0aCkge1xuICAgICAgY29uc3QgcmVsYXRpdmVFeGNlcHRpb25QYXRoID0gcGF0aC5yZWxhdGl2ZShhYnNvbHV0ZUZyb21QYXRoLCBhYnNvbHV0ZUV4Y2VwdGlvblBhdGgpO1xuXG4gICAgICByZXR1cm4gaW1wb3J0VHlwZShyZWxhdGl2ZUV4Y2VwdGlvblBhdGgsIGNvbnRleHQpICE9PSAncGFyZW50JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhcmVCb3RoR2xvYlBhdHRlcm5BbmRBYnNvbHV0ZVBhdGgoYXJlR2xvYlBhdHRlcm5zKSB7XG4gICAgICByZXR1cm4gYXJlR2xvYlBhdHRlcm5zLnNvbWUoKGlzR2xvYikgPT4gaXNHbG9iKSAmJiBhcmVHbG9iUGF0dGVybnMuc29tZSgoaXNHbG9iKSA9PiAhaXNHbG9iKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvcnRJbnZhbGlkRXhjZXB0aW9uUGF0aChub2RlKSB7XG4gICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgIG5vZGUsXG4gICAgICAgIG1lc3NhZ2U6ICdSZXN0cmljdGVkIHBhdGggZXhjZXB0aW9ucyBtdXN0IGJlIGRlc2NlbmRhbnRzIG9mIHRoZSBjb25maWd1cmVkIGBmcm9tYCBwYXRoIGZvciB0aGF0IHpvbmUuJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9ydEludmFsaWRFeGNlcHRpb25NaXhlZEdsb2JBbmROb25HbG9iKG5vZGUpIHtcbiAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgbm9kZSxcbiAgICAgICAgbWVzc2FnZTogJ1Jlc3RyaWN0ZWQgcGF0aCBgZnJvbWAgbXVzdCBjb250YWluIGVpdGhlciBvbmx5IGdsb2IgcGF0dGVybnMgb3Igbm9uZScsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvcnRJbnZhbGlkRXhjZXB0aW9uR2xvYihub2RlKSB7XG4gICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgIG5vZGUsXG4gICAgICAgIG1lc3NhZ2U6ICdSZXN0cmljdGVkIHBhdGggZXhjZXB0aW9ucyBtdXN0IGJlIGdsb2IgcGF0dGVybnMgd2hlbiBgZnJvbWAgY29udGFpbnMgZ2xvYiBwYXR0ZXJucycsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wdXRlTWl4ZWRHbG9iQW5kQWJzb2x1dGVQYXRoVmFsaWRhdG9yKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNQYXRoUmVzdHJpY3RlZDogKCkgPT4gdHJ1ZSxcbiAgICAgICAgaGFzVmFsaWRFeGNlcHRpb25zOiBmYWxzZSxcbiAgICAgICAgcmVwb3J0SW52YWxpZEV4Y2VwdGlvbjogcmVwb3J0SW52YWxpZEV4Y2VwdGlvbk1peGVkR2xvYkFuZE5vbkdsb2IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXB1dGVHbG9iUGF0dGVyblBhdGhWYWxpZGF0b3IoYWJzb2x1dGVGcm9tLCB6b25lRXhjZXB0KSB7XG4gICAgICBsZXQgaXNQYXRoRXhjZXB0aW9uO1xuXG4gICAgICBjb25zdCBtbSA9IG5ldyBSZWdFeHAoYWJzb2x1dGVGcm9tKTtcbiAgICAgIGNvbnN0IGlzUGF0aFJlc3RyaWN0ZWQgPSAoYWJzb2x1dGVJbXBvcnRQYXRoKSA9PiB7XG4gICAgICAgIHJldHVybiBtbS50ZXN0KGFic29sdXRlSW1wb3J0UGF0aCk7XG4gICAgICB9O1xuICAgICAgY29uc3QgaGFzVmFsaWRFeGNlcHRpb25zID0gem9uZUV4Y2VwdC5ldmVyeSgoKSA9PiB0cnVlKTtcblxuICAgICAgaWYgKGhhc1ZhbGlkRXhjZXB0aW9ucykge1xuICAgICAgICBjb25zdCBleGNlcHRpb25zTW0gPSB6b25lRXhjZXB0Lm1hcCgoZXhjZXB0KSA9PiBuZXcgUmVnRXhwKGV4Y2VwdCkpO1xuICAgICAgICBpc1BhdGhFeGNlcHRpb24gPSAoYWJzb2x1dGVJbXBvcnRQYXRoKSA9PiBleGNlcHRpb25zTW0uc29tZSgobW0pID0+IG1tLnRlc3QoYWJzb2x1dGVJbXBvcnRQYXRoKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcG9ydEludmFsaWRFeGNlcHRpb24gPSByZXBvcnRJbnZhbGlkRXhjZXB0aW9uR2xvYjtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNQYXRoUmVzdHJpY3RlZCxcbiAgICAgICAgaGFzVmFsaWRFeGNlcHRpb25zLFxuICAgICAgICBpc1BhdGhFeGNlcHRpb24sXG4gICAgICAgIHJlcG9ydEludmFsaWRFeGNlcHRpb24sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXB1dGVBYnNvbHV0ZVBhdGhWYWxpZGF0b3IoYWJzb2x1dGVGcm9tLCB6b25lRXhjZXB0KSB7XG4gICAgICBsZXQgaXNQYXRoRXhjZXB0aW9uO1xuXG4gICAgICBjb25zdCBpc1BhdGhSZXN0cmljdGVkID0gKGFic29sdXRlSW1wb3J0UGF0aCkgPT4gY29udGFpbnNQYXRoKGFic29sdXRlSW1wb3J0UGF0aCwgYWJzb2x1dGVGcm9tKTtcblxuICAgICAgY29uc3QgYWJzb2x1dGVFeGNlcHRpb25QYXRocyA9IHpvbmVFeGNlcHRcbiAgICAgICAgLm1hcCgoZXhjZXB0aW9uUGF0aCkgPT4gcGF0aC5yZXNvbHZlKGFic29sdXRlRnJvbSwgZXhjZXB0aW9uUGF0aCkpO1xuICAgICAgY29uc3QgaGFzVmFsaWRFeGNlcHRpb25zID0gYWJzb2x1dGVFeGNlcHRpb25QYXRoc1xuICAgICAgICAuZXZlcnkoKGFic29sdXRlRXhjZXB0aW9uUGF0aCkgPT4gaXNWYWxpZEV4Y2VwdGlvblBhdGgoYWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUV4Y2VwdGlvblBhdGgpKTtcblxuICAgICAgaWYgKGhhc1ZhbGlkRXhjZXB0aW9ucykge1xuICAgICAgICBpc1BhdGhFeGNlcHRpb24gPSAoYWJzb2x1dGVJbXBvcnRQYXRoKSA9PiBhYnNvbHV0ZUV4Y2VwdGlvblBhdGhzLnNvbWUoXG4gICAgICAgICAgKGFic29sdXRlRXhjZXB0aW9uUGF0aCkgPT4gY29udGFpbnNQYXRoKGFic29sdXRlSW1wb3J0UGF0aCwgYWJzb2x1dGVFeGNlcHRpb25QYXRoKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVwb3J0SW52YWxpZEV4Y2VwdGlvbiA9IHJlcG9ydEludmFsaWRFeGNlcHRpb25QYXRoO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1BhdGhSZXN0cmljdGVkLFxuICAgICAgICBoYXNWYWxpZEV4Y2VwdGlvbnMsXG4gICAgICAgIGlzUGF0aEV4Y2VwdGlvbixcbiAgICAgICAgcmVwb3J0SW52YWxpZEV4Y2VwdGlvbixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3J0SW52YWxpZEV4Y2VwdGlvbnModmFsaWRhdG9ycywgbm9kZSkge1xuICAgICAgdmFsaWRhdG9ycy5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvci5yZXBvcnRJbnZhbGlkRXhjZXB0aW9uKG5vZGUpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvcnRJbXBvcnRzSW5SZXN0cmljdGVkWm9uZSh2YWxpZGF0b3JzLCBub2RlLCBpbXBvcnRQYXRoLCBjdXN0b21NZXNzYWdlKSB7XG4gICAgICB2YWxpZGF0b3JzLmZvckVhY2goKCkgPT4ge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiBgVW5leHBlY3RlZCBwYXRoIFwie3tpbXBvcnRQYXRofX1cIiBpbXBvcnRlZCBpbiByZXN0cmljdGVkIHpvbmUuJHtjdXN0b21NZXNzYWdlID8gYCAke2N1c3RvbU1lc3NhZ2V9YCA6ICcnfWAsXG4gICAgICAgICAgZGF0YToge2ltcG9ydFBhdGh9LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IG1ha2VQYXRoVmFsaWRhdG9ycyA9ICh6b25lRnJvbSwgem9uZUV4Y2VwdCA9IFtdKSA9PiB7XG4gICAgICBjb25zdCBhbGxab25lRnJvbSA9IFtdLmNvbmNhdCh6b25lRnJvbSk7XG4gICAgICBjb25zdCBhcmVHbG9iUGF0dGVybnMgPSBhbGxab25lRnJvbS5tYXAoKCkgPT4gdHJ1ZSk7XG5cbiAgICAgIGlmIChhcmVCb3RoR2xvYlBhdHRlcm5BbmRBYnNvbHV0ZVBhdGgoYXJlR2xvYlBhdHRlcm5zKSkge1xuICAgICAgICByZXR1cm4gW2NvbXB1dGVNaXhlZEdsb2JBbmRBYnNvbHV0ZVBhdGhWYWxpZGF0b3IoKV07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzR2xvYlBhdHRlcm4gPSBhcmVHbG9iUGF0dGVybnMuZXZlcnkoKGlzR2xvYikgPT4gaXNHbG9iKTtcblxuICAgICAgcmV0dXJuIGFsbFpvbmVGcm9tLm1hcCgoc2luZ2xlWm9uZUZyb20pID0+IHtcbiAgICAgICAgY29uc3QgYWJzb2x1dGVGcm9tID0gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBzaW5nbGVab25lRnJvbSk7XG5cbiAgICAgICAgaWYgKGlzR2xvYlBhdHRlcm4pIHtcbiAgICAgICAgICByZXR1cm4gY29tcHV0ZUdsb2JQYXR0ZXJuUGF0aFZhbGlkYXRvcihhYnNvbHV0ZUZyb20sIHpvbmVFeGNlcHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb21wdXRlQWJzb2x1dGVQYXRoVmFsaWRhdG9yKGFic29sdXRlRnJvbSwgem9uZUV4Y2VwdCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdmFsaWRhdG9ycyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gY2hlY2tGb3JSZXN0cmljdGVkSW1wb3J0UGF0aChpbXBvcnRQYXRoLCBub2RlKSB7XG4gICAgICBjb25zdCBhYnNvbHV0ZUltcG9ydFBhdGggPSByZXNvbHZlKGltcG9ydFBhdGgsIGNvbnRleHQpO1xuXG4gICAgICBpZiAoIWFic29sdXRlSW1wb3J0UGF0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG1hdGNoaW5nWm9uZXMuZm9yRWFjaCgoem9uZSwgaW5kZXgpID0+IHtcbiAgICAgICAgaWYgKCF2YWxpZGF0b3JzW2luZGV4XSkge1xuICAgICAgICAgIHZhbGlkYXRvcnNbaW5kZXhdID0gbWFrZVBhdGhWYWxpZGF0b3JzKHpvbmUuZnJvbSwgem9uZS5leGNlcHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoID0gdmFsaWRhdG9yc1tpbmRleF0uZmlsdGVyKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvci5pc1BhdGhSZXN0cmljdGVkKGFic29sdXRlSW1wb3J0UGF0aCkpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkYXRvcnNXaXRoSW52YWxpZEV4Y2VwdGlvbnMgPSBhcHBsaWNhYmxlVmFsaWRhdG9yc0ZvckltcG9ydFBhdGguZmlsdGVyKCh2YWxpZGF0b3IpID0+ICF2YWxpZGF0b3IuaGFzVmFsaWRFeGNlcHRpb25zKTtcbiAgICAgICAgcmVwb3J0SW52YWxpZEV4Y2VwdGlvbnModmFsaWRhdG9yc1dpdGhJbnZhbGlkRXhjZXB0aW9ucywgbm9kZSk7XG5cbiAgICAgICAgY29uc3QgYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoRXhjbHVkaW5nRXhjZXB0aW9ucyA9IGFwcGxpY2FibGVWYWxpZGF0b3JzRm9ySW1wb3J0UGF0aFxuICAgICAgICAgIC5maWx0ZXIoKHZhbGlkYXRvcikgPT4gdmFsaWRhdG9yLmhhc1ZhbGlkRXhjZXB0aW9ucyAmJiAhdmFsaWRhdG9yLmlzUGF0aEV4Y2VwdGlvbihhYnNvbHV0ZUltcG9ydFBhdGgpKTtcbiAgICAgICAgcmVwb3J0SW1wb3J0c0luUmVzdHJpY3RlZFpvbmUoYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoRXhjbHVkaW5nRXhjZXB0aW9ucywgbm9kZSwgaW1wb3J0UGF0aCwgem9uZS5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtb2R1bGVWaXNpdG9yKChzb3VyY2UpID0+IHtcbiAgICAgIGNoZWNrRm9yUmVzdHJpY3RlZEltcG9ydFBhdGgoc291cmNlLnZhbHVlLCBzb3VyY2UpO1xuICAgIH0sIHtjb21tb25qczogdHJ1ZX0pO1xuICB9LFxufTtcbiJdfQ==