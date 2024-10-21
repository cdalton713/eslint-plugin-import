'use strict';var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _contextCompat = require('eslint-module-utils/contextCompat');
var _resolve = require('eslint-module-utils/resolve');var _resolve2 = _interopRequireDefault(_resolve);
var _moduleVisitor = require('eslint-module-utils/moduleVisitor');var _moduleVisitor2 = _interopRequireDefault(_moduleVisitor);

var _importType = require('../core/importType');var _importType2 = _interopRequireDefault(_importType);
var _docsUrl = require('../docsUrl');var _docsUrl2 = _interopRequireDefault(_docsUrl);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { 'default': obj };}

function isMatchingTargetPath(filename, targetPath) {
  var mm = new RegExp(targetPath);
  return mm.test(filename);
}

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
      var currentFilename = (0, _contextCompat.getPhysicalFilename)(context);

      var matchingZones = restrictedPaths.filter(
      function (zone) {return [].concat(zone.target).
        map(function (target) {return _path2['default'].resolve(basePath, target);}).
        some(function (targetPath) {return isMatchingTargetPath(currentFilename, targetPath);});});


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
        var isPathRestricted = function () {function isPathRestricted(absoluteImportPath) {return mm.test(absoluteImportPath);}return isPathRestricted;}();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1yZXN0cmljdGVkLXBhdGhzLmpzIl0sIm5hbWVzIjpbImlzTWF0Y2hpbmdUYXJnZXRQYXRoIiwiZmlsZW5hbWUiLCJ0YXJnZXRQYXRoIiwibW0iLCJSZWdFeHAiLCJ0ZXN0IiwiY29udGFpbnNQYXRoIiwiZmlsZXBhdGgiLCJ0YXJnZXQiLCJyZWxhdGl2ZSIsInBhdGgiLCJzdGFydHNXaXRoIiwibW9kdWxlIiwiZXhwb3J0cyIsIm1ldGEiLCJ0eXBlIiwiZG9jcyIsImNhdGVnb3J5IiwiZGVzY3JpcHRpb24iLCJ1cmwiLCJzY2hlbWEiLCJwcm9wZXJ0aWVzIiwiem9uZXMiLCJtaW5JdGVtcyIsIml0ZW1zIiwiYW55T2YiLCJ1bmlxdWVJdGVtcyIsIm1pbkxlbmd0aCIsImZyb20iLCJleGNlcHQiLCJtZXNzYWdlIiwiYWRkaXRpb25hbFByb3BlcnRpZXMiLCJiYXNlUGF0aCIsImNyZWF0ZSIsIm5vUmVzdHJpY3RlZFBhdGhzIiwiY29udGV4dCIsIm9wdGlvbnMiLCJyZXN0cmljdGVkUGF0aHMiLCJwcm9jZXNzIiwiY3dkIiwiY3VycmVudEZpbGVuYW1lIiwibWF0Y2hpbmdab25lcyIsImZpbHRlciIsInpvbmUiLCJjb25jYXQiLCJtYXAiLCJyZXNvbHZlIiwic29tZSIsImlzVmFsaWRFeGNlcHRpb25QYXRoIiwiYWJzb2x1dGVGcm9tUGF0aCIsImFic29sdXRlRXhjZXB0aW9uUGF0aCIsInJlbGF0aXZlRXhjZXB0aW9uUGF0aCIsImFyZUJvdGhHbG9iUGF0dGVybkFuZEFic29sdXRlUGF0aCIsImFyZUdsb2JQYXR0ZXJucyIsImlzR2xvYiIsInJlcG9ydEludmFsaWRFeGNlcHRpb25QYXRoIiwibm9kZSIsInJlcG9ydCIsInJlcG9ydEludmFsaWRFeGNlcHRpb25NaXhlZEdsb2JBbmROb25HbG9iIiwicmVwb3J0SW52YWxpZEV4Y2VwdGlvbkdsb2IiLCJjb21wdXRlTWl4ZWRHbG9iQW5kQWJzb2x1dGVQYXRoVmFsaWRhdG9yIiwiaXNQYXRoUmVzdHJpY3RlZCIsImhhc1ZhbGlkRXhjZXB0aW9ucyIsInJlcG9ydEludmFsaWRFeGNlcHRpb24iLCJjb21wdXRlR2xvYlBhdHRlcm5QYXRoVmFsaWRhdG9yIiwiYWJzb2x1dGVGcm9tIiwiem9uZUV4Y2VwdCIsImlzUGF0aEV4Y2VwdGlvbiIsImFic29sdXRlSW1wb3J0UGF0aCIsImV2ZXJ5IiwiZXhjZXB0aW9uc01tIiwiY29tcHV0ZUFic29sdXRlUGF0aFZhbGlkYXRvciIsImFic29sdXRlRXhjZXB0aW9uUGF0aHMiLCJleGNlcHRpb25QYXRoIiwicmVwb3J0SW52YWxpZEV4Y2VwdGlvbnMiLCJ2YWxpZGF0b3JzIiwiZm9yRWFjaCIsInZhbGlkYXRvciIsInJlcG9ydEltcG9ydHNJblJlc3RyaWN0ZWRab25lIiwiaW1wb3J0UGF0aCIsImN1c3RvbU1lc3NhZ2UiLCJkYXRhIiwibWFrZVBhdGhWYWxpZGF0b3JzIiwiem9uZUZyb20iLCJhbGxab25lRnJvbSIsImlzR2xvYlBhdHRlcm4iLCJzaW5nbGVab25lRnJvbSIsImNoZWNrRm9yUmVzdHJpY3RlZEltcG9ydFBhdGgiLCJpbmRleCIsImFwcGxpY2FibGVWYWxpZGF0b3JzRm9ySW1wb3J0UGF0aCIsInZhbGlkYXRvcnNXaXRoSW52YWxpZEV4Y2VwdGlvbnMiLCJhcHBsaWNhYmxlVmFsaWRhdG9yc0ZvckltcG9ydFBhdGhFeGNsdWRpbmdFeGNlcHRpb25zIiwic291cmNlIiwidmFsdWUiLCJjb21tb25qcyJdLCJtYXBwaW5ncyI6ImFBQUEsNEI7QUFDQTtBQUNBLHNEO0FBQ0Esa0U7O0FBRUEsZ0Q7QUFDQSxxQzs7QUFFQSxTQUFTQSxvQkFBVCxDQUE4QkMsUUFBOUIsRUFBd0NDLFVBQXhDLEVBQW9EO0FBQ2xELE1BQU1DLEtBQUssSUFBSUMsTUFBSixDQUFXRixVQUFYLENBQVg7QUFDQSxTQUFPQyxHQUFHRSxJQUFILENBQVFKLFFBQVIsQ0FBUDtBQUNEOztBQUVELElBQU1LLGVBQWUsU0FBZkEsWUFBZSxDQUFDQyxRQUFELEVB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LElBNURlLEVBQWpCIiwiZmlsZSI6Im5vLXJlc3RyaWN0ZWQtcGF0aHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGdldFBoeXNpY2FsRmlsZW5hbWUgfSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL2NvbnRleHRDb21wYXQnO1xuaW1wb3J0IHJlc29sdmUgZnJvbSAnZXNsaW50LW1vZHVsZS11dGlscy9yZXNvbHZlJztcbmltcG9ydCBtb2R1bGVWaXNpdG9yIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvbW9kdWxlVmlzaXRvcic7XG5cbmltcG9ydCBpbXBvcnRUeXBlIGZyb20gJy4uL2NvcmUvaW1wb3J0VHlwZSc7XG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJztcblxuZnVuY3Rpb24gaXNNYXRjaGluZ1RhcmdldFBhdGgoZmlsZW5hbWUsIHRhcmdldFBhdGgpIHtcbiAgY29uc3QgbW0gPSBuZXcgUmVnRXhwKHRhcmdldFBhdGgpO1xuICByZXR1cm4gbW0udGVzdChmaWxlbmFtZSk7XG59XG5cbmNvbnN0IGNvbnRhaW5zUGF0aCA9IChmaWxlcGF0aCwgdGFyZ2V0KSA9PiB7XG4gIGNvbnN0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSh0YXJnZXQsIGZpbGVwYXRoKTtcbiAgcmV0dXJuIHJlbGF0aXZlID09PSAnJyB8fCAhcmVsYXRpdmUuc3RhcnRzV2l0aCgnLi4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtZXRhOiB7XG4gICAgdHlwZTogJ3Byb2JsZW0nLFxuICAgIGRvY3M6IHtcbiAgICAgIGNhdGVnb3J5OiAnU3RhdGljIGFuYWx5c2lzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW5mb3JjZSB3aGljaCBmaWxlcyBjYW4gYmUgaW1wb3J0ZWQgaW4gYSBnaXZlbiBmb2xkZXIuJyxcbiAgICAgIHVybDogZG9jc1VybCgnbm8tcmVzdHJpY3RlZC1wYXRocycpLFxuICAgIH0sXG5cbiAgICBzY2hlbWE6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB6b25lczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgIG1pbkl0ZW1zOiAxLFxuICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHtcbiAgICAgICAgICAgICAgICAgIGFueU9mOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBtaW5MZW5ndGg6IDEsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnJvbToge1xuICAgICAgICAgICAgICAgICAgYW55T2Y6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZUl0ZW1zOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBleGNlcHQ6IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJhc2VQYXRoOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uIG5vUmVzdHJpY3RlZFBhdGhzKGNvbnRleHQpIHtcbiAgICBjb25zdCBvcHRpb25zID0gY29udGV4dC5vcHRpb25zWzBdIHx8IHt9O1xuICAgIGNvbnN0IHJlc3RyaWN0ZWRQYXRocyA9IG9wdGlvbnMuem9uZXMgfHwgW107XG4gICAgY29uc3QgYmFzZVBhdGggPSBvcHRpb25zLmJhc2VQYXRoIHx8IHByb2Nlc3MuY3dkKCk7XG4gICAgY29uc3QgY3VycmVudEZpbGVuYW1lID0gZ2V0UGh5c2ljYWxGaWxlbmFtZShjb250ZXh0KTtcblxuICAgIGNvbnN0IG1hdGNoaW5nWm9uZXMgPSByZXN0cmljdGVkUGF0aHMuZmlsdGVyKFxuICAgICAgKHpvbmUpID0+IFtdLmNvbmNhdCh6b25lLnRhcmdldClcbiAgICAgICAgLm1hcCgodGFyZ2V0KSA9PiBwYXRoLnJlc29sdmUoYmFzZVBhdGgsIHRhcmdldCkpXG4gICAgICAgIC5zb21lKCh0YXJnZXRQYXRoKSA9PiBpc01hdGNoaW5nVGFyZ2V0UGF0aChjdXJyZW50RmlsZW5hbWUsIHRhcmdldFBhdGgpKSxcbiAgICApO1xuXG4gICAgZnVuY3Rpb24gaXNWYWxpZEV4Y2VwdGlvblBhdGgoYWJzb2x1dGVGcm9tUGF0aCwgYWJzb2x1dGVFeGNlcHRpb25QYXRoKSB7XG4gICAgICBjb25zdCByZWxhdGl2ZUV4Y2VwdGlvblBhdGggPSBwYXRoLnJlbGF0aXZlKGFic29sdXRlRnJvbVBhdGgsIGFic29sdXRlRXhjZXB0aW9uUGF0aCk7XG5cbiAgICAgIHJldHVybiBpbXBvcnRUeXBlKHJlbGF0aXZlRXhjZXB0aW9uUGF0aCwgY29udGV4dCkgIT09ICdwYXJlbnQnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFyZUJvdGhHbG9iUGF0dGVybkFuZEFic29sdXRlUGF0aChhcmVHbG9iUGF0dGVybnMpIHtcbiAgICAgIHJldHVybiBhcmVHbG9iUGF0dGVybnMuc29tZSgoaXNHbG9iKSA9PiBpc0dsb2IpICYmIGFyZUdsb2JQYXR0ZXJucy5zb21lKChpc0dsb2IpID0+ICFpc0dsb2IpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9ydEludmFsaWRFeGNlcHRpb25QYXRoKG5vZGUpIHtcbiAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgbm9kZSxcbiAgICAgICAgbWVzc2FnZTogJ1Jlc3RyaWN0ZWQgcGF0aCBleGNlcHRpb25zIG11c3QgYmUgZGVzY2VuZGFudHMgb2YgdGhlIGNvbmZpZ3VyZWQgYGZyb21gIHBhdGggZm9yIHRoYXQgem9uZS4nLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3J0SW52YWxpZEV4Y2VwdGlvbk1peGVkR2xvYkFuZE5vbkdsb2Iobm9kZSkge1xuICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICBub2RlLFxuICAgICAgICBtZXNzYWdlOiAnUmVzdHJpY3RlZCBwYXRoIGBmcm9tYCBtdXN0IGNvbnRhaW4gZWl0aGVyIG9ubHkgZ2xvYiBwYXR0ZXJucyBvciBub25lJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9ydEludmFsaWRFeGNlcHRpb25HbG9iKG5vZGUpIHtcbiAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgbm9kZSxcbiAgICAgICAgbWVzc2FnZTogJ1Jlc3RyaWN0ZWQgcGF0aCBleGNlcHRpb25zIG11c3QgYmUgZ2xvYiBwYXR0ZXJucyB3aGVuIGBmcm9tYCBjb250YWlucyBnbG9iIHBhdHRlcm5zJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXB1dGVNaXhlZEdsb2JBbmRBYnNvbHV0ZVBhdGhWYWxpZGF0b3IoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1BhdGhSZXN0cmljdGVkOiAoKSA9PiB0cnVlLFxuICAgICAgICBoYXNWYWxpZEV4Y2VwdGlvbnM6IGZhbHNlLFxuICAgICAgICByZXBvcnRJbnZhbGlkRXhjZXB0aW9uOiByZXBvcnRJbnZhbGlkRXhjZXB0aW9uTWl4ZWRHbG9iQW5kTm9uR2xvYixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcHV0ZUdsb2JQYXR0ZXJuUGF0aFZhbGlkYXRvcihhYnNvbHV0ZUZyb20sIHpvbmVFeGNlcHQpIHtcbiAgICAgIGxldCBpc1BhdGhFeGNlcHRpb247XG5cbiAgICAgIGNvbnN0IG1tID0gbmV3IFJlZ0V4cChhYnNvbHV0ZUZyb20pO1xuICAgICAgY29uc3QgaXNQYXRoUmVzdHJpY3RlZCA9IChhYnNvbHV0ZUltcG9ydFBhdGgpID0+IG1tLnRlc3QoYWJzb2x1dGVJbXBvcnRQYXRoKTtcbiAgICAgIGNvbnN0IGhhc1ZhbGlkRXhjZXB0aW9ucyA9IHpvbmVFeGNlcHQuZXZlcnkoKCkgPT4gdHJ1ZSk7XG5cbiAgICAgIGlmIChoYXNWYWxpZEV4Y2VwdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZXhjZXB0aW9uc01tID0gem9uZUV4Y2VwdC5tYXAoKGV4Y2VwdCkgPT4gbmV3IFJlZ0V4cChleGNlcHQpKTtcbiAgICAgICAgaXNQYXRoRXhjZXB0aW9uID0gKGFic29sdXRlSW1wb3J0UGF0aCkgPT4gZXhjZXB0aW9uc01tLnNvbWUoKG1tKSA9PiBtbS50ZXN0KGFic29sdXRlSW1wb3J0UGF0aCkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBvcnRJbnZhbGlkRXhjZXB0aW9uID0gcmVwb3J0SW52YWxpZEV4Y2VwdGlvbkdsb2I7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzUGF0aFJlc3RyaWN0ZWQsXG4gICAgICAgIGhhc1ZhbGlkRXhjZXB0aW9ucyxcbiAgICAgICAgaXNQYXRoRXhjZXB0aW9uLFxuICAgICAgICByZXBvcnRJbnZhbGlkRXhjZXB0aW9uLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wdXRlQWJzb2x1dGVQYXRoVmFsaWRhdG9yKGFic29sdXRlRnJvbSwgem9uZUV4Y2VwdCkge1xuICAgICAgbGV0IGlzUGF0aEV4Y2VwdGlvbjtcblxuICAgICAgY29uc3QgaXNQYXRoUmVzdHJpY3RlZCA9IChhYnNvbHV0ZUltcG9ydFBhdGgpID0+IGNvbnRhaW5zUGF0aChhYnNvbHV0ZUltcG9ydFBhdGgsIGFic29sdXRlRnJvbSk7XG5cbiAgICAgIGNvbnN0IGFic29sdXRlRXhjZXB0aW9uUGF0aHMgPSB6b25lRXhjZXB0XG4gICAgICAgIC5tYXAoKGV4Y2VwdGlvblBhdGgpID0+IHBhdGgucmVzb2x2ZShhYnNvbHV0ZUZyb20sIGV4Y2VwdGlvblBhdGgpKTtcbiAgICAgIGNvbnN0IGhhc1ZhbGlkRXhjZXB0aW9ucyA9IGFic29sdXRlRXhjZXB0aW9uUGF0aHNcbiAgICAgICAgLmV2ZXJ5KChhYnNvbHV0ZUV4Y2VwdGlvblBhdGgpID0+IGlzVmFsaWRFeGNlcHRpb25QYXRoKGFic29sdXRlRnJvbSwgYWJzb2x1dGVFeGNlcHRpb25QYXRoKSk7XG5cbiAgICAgIGlmIChoYXNWYWxpZEV4Y2VwdGlvbnMpIHtcbiAgICAgICAgaXNQYXRoRXhjZXB0aW9uID0gKGFic29sdXRlSW1wb3J0UGF0aCkgPT4gYWJzb2x1dGVFeGNlcHRpb25QYXRocy5zb21lKFxuICAgICAgICAgIChhYnNvbHV0ZUV4Y2VwdGlvblBhdGgpID0+IGNvbnRhaW5zUGF0aChhYnNvbHV0ZUltcG9ydFBhdGgsIGFic29sdXRlRXhjZXB0aW9uUGF0aCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcG9ydEludmFsaWRFeGNlcHRpb24gPSByZXBvcnRJbnZhbGlkRXhjZXB0aW9uUGF0aDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNQYXRoUmVzdHJpY3RlZCxcbiAgICAgICAgaGFzVmFsaWRFeGNlcHRpb25zLFxuICAgICAgICBpc1BhdGhFeGNlcHRpb24sXG4gICAgICAgIHJlcG9ydEludmFsaWRFeGNlcHRpb24sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9ydEludmFsaWRFeGNlcHRpb25zKHZhbGlkYXRvcnMsIG5vZGUpIHtcbiAgICAgIHZhbGlkYXRvcnMuZm9yRWFjaCgodmFsaWRhdG9yKSA9PiB2YWxpZGF0b3IucmVwb3J0SW52YWxpZEV4Y2VwdGlvbihub2RlKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3J0SW1wb3J0c0luUmVzdHJpY3RlZFpvbmUodmFsaWRhdG9ycywgbm9kZSwgaW1wb3J0UGF0aCwgY3VzdG9tTWVzc2FnZSkge1xuICAgICAgdmFsaWRhdG9ycy5mb3JFYWNoKCgpID0+IHtcbiAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgbWVzc2FnZTogYFVuZXhwZWN0ZWQgcGF0aCBcInt7aW1wb3J0UGF0aH19XCIgaW1wb3J0ZWQgaW4gcmVzdHJpY3RlZCB6b25lLiR7Y3VzdG9tTWVzc2FnZSA/IGAgJHtjdXN0b21NZXNzYWdlfWAgOiAnJ31gLFxuICAgICAgICAgIGRhdGE6IHsgaW1wb3J0UGF0aCB9LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IG1ha2VQYXRoVmFsaWRhdG9ycyA9ICh6b25lRnJvbSwgem9uZUV4Y2VwdCA9IFtdKSA9PiB7XG4gICAgICBjb25zdCBhbGxab25lRnJvbSA9IFtdLmNvbmNhdCh6b25lRnJvbSk7XG4gICAgICBjb25zdCBhcmVHbG9iUGF0dGVybnMgPSBhbGxab25lRnJvbS5tYXAoKCkgPT4gdHJ1ZSk7XG5cbiAgICAgIGlmIChhcmVCb3RoR2xvYlBhdHRlcm5BbmRBYnNvbHV0ZVBhdGgoYXJlR2xvYlBhdHRlcm5zKSkge1xuICAgICAgICByZXR1cm4gW2NvbXB1dGVNaXhlZEdsb2JBbmRBYnNvbHV0ZVBhdGhWYWxpZGF0b3IoKV07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzR2xvYlBhdHRlcm4gPSBhcmVHbG9iUGF0dGVybnMuZXZlcnkoKGlzR2xvYikgPT4gaXNHbG9iKTtcblxuICAgICAgcmV0dXJuIGFsbFpvbmVGcm9tLm1hcCgoc2luZ2xlWm9uZUZyb20pID0+IHtcbiAgICAgICAgY29uc3QgYWJzb2x1dGVGcm9tID0gcGF0aC5yZXNvbHZlKGJhc2VQYXRoLCBzaW5nbGVab25lRnJvbSk7XG5cbiAgICAgICAgaWYgKGlzR2xvYlBhdHRlcm4pIHtcbiAgICAgICAgICByZXR1cm4gY29tcHV0ZUdsb2JQYXR0ZXJuUGF0aFZhbGlkYXRvcihhYnNvbHV0ZUZyb20sIHpvbmVFeGNlcHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb21wdXRlQWJzb2x1dGVQYXRoVmFsaWRhdG9yKGFic29sdXRlRnJvbSwgem9uZUV4Y2VwdCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdmFsaWRhdG9ycyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gY2hlY2tGb3JSZXN0cmljdGVkSW1wb3J0UGF0aChpbXBvcnRQYXRoLCBub2RlKSB7XG4gICAgICBjb25zdCBhYnNvbHV0ZUltcG9ydFBhdGggPSByZXNvbHZlKGltcG9ydFBhdGgsIGNvbnRleHQpO1xuXG4gICAgICBpZiAoIWFic29sdXRlSW1wb3J0UGF0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG1hdGNoaW5nWm9uZXMuZm9yRWFjaCgoem9uZSwgaW5kZXgpID0+IHtcbiAgICAgICAgaWYgKCF2YWxpZGF0b3JzW2luZGV4XSkge1xuICAgICAgICAgIHZhbGlkYXRvcnNbaW5kZXhdID0gbWFrZVBhdGhWYWxpZGF0b3JzKHpvbmUuZnJvbSwgem9uZS5leGNlcHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoID0gdmFsaWRhdG9yc1tpbmRleF0uZmlsdGVyKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvci5pc1BhdGhSZXN0cmljdGVkKGFic29sdXRlSW1wb3J0UGF0aCkpO1xuXG4gICAgICAgIGNvbnN0IHZhbGlkYXRvcnNXaXRoSW52YWxpZEV4Y2VwdGlvbnMgPSBhcHBsaWNhYmxlVmFsaWRhdG9yc0ZvckltcG9ydFBhdGguZmlsdGVyKCh2YWxpZGF0b3IpID0+ICF2YWxpZGF0b3IuaGFzVmFsaWRFeGNlcHRpb25zKTtcbiAgICAgICAgcmVwb3J0SW52YWxpZEV4Y2VwdGlvbnModmFsaWRhdG9yc1dpdGhJbnZhbGlkRXhjZXB0aW9ucywgbm9kZSk7XG5cbiAgICAgICAgY29uc3QgYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoRXhjbHVkaW5nRXhjZXB0aW9ucyA9IGFwcGxpY2FibGVWYWxpZGF0b3JzRm9ySW1wb3J0UGF0aFxuICAgICAgICAgIC5maWx0ZXIoKHZhbGlkYXRvcikgPT4gdmFsaWRhdG9yLmhhc1ZhbGlkRXhjZXB0aW9ucyAmJiAhdmFsaWRhdG9yLmlzUGF0aEV4Y2VwdGlvbihhYnNvbHV0ZUltcG9ydFBhdGgpKTtcbiAgICAgICAgcmVwb3J0SW1wb3J0c0luUmVzdHJpY3RlZFpvbmUoYXBwbGljYWJsZVZhbGlkYXRvcnNGb3JJbXBvcnRQYXRoRXhjbHVkaW5nRXhjZXB0aW9ucywgbm9kZSwgaW1wb3J0UGF0aCwgem9uZS5tZXNzYWdlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtb2R1bGVWaXNpdG9yKChzb3VyY2UpID0+IHtcbiAgICAgIGNoZWNrRm9yUmVzdHJpY3RlZEltcG9ydFBhdGgoc291cmNlLnZhbHVlLCBzb3VyY2UpO1xuICAgIH0sIHsgY29tbW9uanM6IHRydWUgfSk7XG4gIH0sXG59O1xuIl19