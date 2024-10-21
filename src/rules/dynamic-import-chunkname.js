import { getSourceCode } from 'eslint-module-utils/contextCompat';
import vm from 'vm';

import docsUrl from '../docsUrl';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Enforce a leading comment with the webpackChunkName for dynamic imports.',
      url: docsUrl('dynamic-import-chunkname'),
    },
    schema: [{
      type: 'object',
      properties: {
        importFunctions: {
          type: 'array',
          uniqueItems: true,
          items: {
            type: 'string',
          },
        },
        allowEmpty: {
          type: 'boolean',
        },
        webpackChunknameFormat: {
          type: 'string',
        },
      },
    }],
    hasSuggestions: true,
  },

  create(context) {
    const config = context.options[0];
    const { importFunctions = [], allowEmpty = false } = config || {};
    const { webpackChunknameFormat = '([0-9a-zA-Z-_/.]|\\[(request|index)\\])+' } = config || {};

    const paddedCommentRegex = /^ (\S[\s\S]+\S) $/;
    const commentStyleRegex = /^( ((webpackChunkName: .+)|((webpackPrefetch|webpackPreload): (true|false|-?[0-9]+))|(webpackIgnore: (true|false))|((webpackInclude|webpackExclude): \/.*\/)|(webpackMode: ["'](lazy|lazy-once|eager|weak)["'])|(webpackExports: (['"]\w+['"]|\[(['"]\w+['"], *)+(['"]\w+['"]*)\]))),?)+ $/;
    const chunkSubstrFormat = `webpackChunkName: ["']${webpackChunknameFormat}["'],? `;
    const chunkSubstrRegex = new RegExp(chunkSubstrFormat);
    const eagerModeFormat = `webpackMode: ["']eager["'],? `;
    const eagerModeRegex = new RegExp(eagerModeFormat);

    function run(node, arg) {
      const sourceCode = getSourceCode(context);
      const leadingComments = sourceCode.getCommentsBefore
        ? sourceCode.getCommentsBefore(arg) // This method is available in ESLint >= 4.
        : sourceCode.getComments(arg).leading; // This method is deprecated in ESLint 7.

      if ((!leadingComments || leadingComments.length === 0) && !allowEmpty) {
        context.report({
          node,
          message: 'dynamic imports require a leading comment with the webpack chunkname',
        });
        return;
      }

      let isChunknamePresent = false;
      let isEagerModePresent = false;

      for (const comment of leadingComments) {
        if (comment.type !== 'Block') {
          context.report({
            node,
            message: 'dynamic imports require a /* foo */ style comment, not a // foo comment',
          });
          return;
        }

        if (!paddedCommentRegex.test(comment.value)) {
          context.report({
            node,
            message: `dynamic imports require a block comment padded with spaces - /* foo */`,
          });
          return;
        }

        try {
          // just like webpack itself does
          vm.runInNewContext(`(function() {return {${comment.value}}})()`);
        } catch (error) {
          context.report({
            node,
            message: `dynamic imports require a "webpack" comment with valid syntax`,
          });
          return;
        }

        if (!commentStyleRegex.test(comment.value)) {
          context.report({
            node,
            message:
              `dynamic imports require a "webpack" comment with valid syntax`,
          });
          return;
        }

        if (eagerModeRegex.test(comment.value)) {
          isEagerModePresent = true;
        }

        if (chunkSubstrRegex.test(comment.value)) {
          isChunknamePresent = true;
        }
      }

      if (isChunknamePresent && isEagerModePresent) {
        context.report({
          node,
          message: 'dynamic imports using eager mode do not need a webpackChunkName',
          suggest: [
            {
              desc: 'Remove webpackChunkName',
              fix(fixer) {
                for (const comment of leadingComments) {
                  if (chunkSubstrRegex.test(comment.value)) {
                    const replacement = comment.value.replace(chunkSubstrRegex, '').trim().replace(/,$/, '');
                    if (replacement === '') {
                      return fixer.remove(comment);
                    } else {
                      return fixer.replaceText(comment, `/* ${replacement} */`);
                    }
                  }
                }
              },
            },
            {
              desc: 'Remove webpackMode',
              fix(fixer) {
                for (const comment of leadingComments) {
                  if (eagerModeRegex.test(comment.value)) {
                    const replacement = comment.value.replace(eagerModeRegex, '').trim().replace(/,$/, '');
                    if (replacement === '') {
                      return fixer.remove(comment);
                    } else {
                      return fixer.replaceText(comment, `/* ${replacement} */`);
                    }
                  }
                }
              },
            },
          ],
        });
      }

      if (!isChunknamePresent && !allowEmpty && !isEagerModePresent) {
        context.report({
          node,
          message:
            `dynamic imports require a leading comment in the form /*${chunkSubstrFormat}*/`,
        });
      }
    }

    return {
      ImportExpression(node) {
        run(node, node.source);
      },

      CallExpression(node) {
        if (node.callee.type !== 'Import' && importFunctions.indexOf(node.callee.name) < 0) {
          return;
        }

        run(node, node.arguments[0]);
      },
    };
  },
};
