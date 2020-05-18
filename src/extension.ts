import {
  ExtensionContext,
  commands,
  window,
  Range,
  Position,
  TextEditor,
  TextDocument,
  Selection,
  TextEditorEdit,
} from 'vscode';

const classNameStringRegex = /class(name)?="([^"]+)"/i;
const classNamesImportRegex = /import \w+ from ['"]classnames['"](;)?/gi;

export function activate(context: ExtensionContext) {
  const classNameify = commands.registerCommand(
    'extension.classnameify',
    () => {
      try {
        checkConditions();
        const propPosition = getPropPosition();
        const newPropText = getNewClassNameProp(propPosition);
        getActiveEditor().edit((editBuilder) => {
          editBuilder.replace(propPosition, newPropText);
          addImportIfNeeded(editBuilder);
        });
      } catch (e) {
        window.showErrorMessage(`Error: ${e.message}`);
      }
    },
  );

  context.subscriptions.push(classNameify);
}

function checkConditions(): void {
  const editor = window.activeTextEditor;
  if (!editor) {
    throw new Error('Must have an active editor open');
  }
  const { document } = editor;
  if (
    document.languageId !== 'typescriptreact' &&
    document.languageId !== 'javascriptreact'
  ) {
    window.showErrorMessage('Must be jsx or tsx to use classnameify');
    throw new Error('Must be jsx or tsx to use classnameify');
  }
}

function getPropPosition(): Range {
  const lineNumber = getCurrentLineNumber();
  const lineText = getCurrentLineText();
  const propString = (lineText.match(classNameStringRegex) ?? [])[0];
  if (!propString) {
    throw new Error('could not find className prop');
  }
  const startIndex = lineText.indexOf(propString);
  const endIndex = startIndex + propString.length;
  const startPosition = new Position(lineNumber, startIndex);
  const endPosition = new Position(lineNumber, endIndex);
  return new Range(startPosition, endPosition);
}

function getNewClassNameProp(propTextRange: Range): string {
  const propText = getDocument().getText(propTextRange);
  const className = propText.split('"')[1];
  if (!className) {
    throw new Error('could not parse class prop');
  }
  return `className={classNames('${className}')}`;
}

function getCurrentLineNumber(): number {
  return getSelection().start.line as number;
}

function getCurrentLineText(): string {
  return getDocument().lineAt(getCurrentLineNumber()).text;
}

function needsClassNamesImport(): boolean {
  return !classNamesImportRegex.test(getDocument().getText());
}

function getLastImportLine(): number {
  let lastImportLine = 0;
  while (
    lastImportLine < getDocument().lineCount &&
    getDocument().lineAt(lastImportLine).text.startsWith('import')
  ) {
    lastImportLine++;
  }
  if (lastImportLine >= getDocument().lineCount) {
    throw new Error('could not find location to add import');
  }
  return lastImportLine;
}

function addImportIfNeeded(editBuilder: TextEditorEdit): void {
  const lastImportLine = getLastImportLine();
  if (needsClassNamesImport()) {
    const importPosition = new Position(lastImportLine, 0);
    editBuilder.insert(
      importPosition,
      "import classNames from 'classNames';\n",
    );
  }
}

function getActiveEditor(): TextEditor {
  return window.activeTextEditor as TextEditor;
}

function getDocument(): TextDocument {
  return getActiveEditor().document;
}

function getSelection(): Selection {
  return getActiveEditor().selection;
}
