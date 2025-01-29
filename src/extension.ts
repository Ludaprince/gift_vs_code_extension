import * as vscode from 'vscode';
import * as fs from 'fs';
// import * as path from 'path';
// import * as xlsx from 'xlsx';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating moodle-gift-tools extension...');

    // Command for importing a CSV file
    let importCsvDisposable = vscode.commands.registerCommand('extension.convertToGIFT', async () => {
        // 1. Open a file picker dialog to select a CSV file
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select CSV File',
            filters: {
                'CSV Files': ['csv']
            }
        });

        if (!fileUri || fileUri.length === 0) {
            vscode.window.showErrorMessage('No file selected.');
            return;
        }

        const filePath = fileUri[0].fsPath;

        // 2. Read the CSV file content
        let csvContent: string;
        try {
            csvContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to read the file: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('Failed to read the file: Unknown error.');
            }
            return;
        }

        // 3. Parse the CSV content
        const rows = csvContent.split('\n').map(row => row.split(','));
        if (rows.length < 2) {
            vscode.window.showErrorMessage('CSV file is empty or improperly formatted.');
            return;
        }

        const headers = rows[0];
        const questions = rows.slice(1);

        // 4. Convert each row to GIFT format
        let giftContent = '';
        for (const question of questions) {
            const [type, questionText, correctAnswer, ...options] = question;

            if (!type || !questionText) {
                continue; // Skip incomplete rows
            }

            if (type === 'Multiple Choice') {
                const formattedOptions = options.map(option => 
                    option.startsWith('*') ? `=${option.slice(1)}` : `~${option}`
                );
                giftContent += `::${questionText}:: ${questionText} { ${formattedOptions.join(' ')} }\n\n`;
            } else if (type === 'True/False') {
                giftContent += `::${questionText}:: ${questionText} { ${correctAnswer.toUpperCase()} }\n\n`;
            } else if (type === 'Short Answer') {
                giftContent += `::${questionText}:: ${questionText} { =${correctAnswer} }\n\n`;
            } else if (type === 'Numeric') {
                giftContent += `::${questionText}:: ${questionText} { #${correctAnswer} }\n\n`;
            } else if (type === 'Essay') {
                if (correctAnswer.trim() === '') {
                    giftContent += `::${questionText}:: ${questionText} { }\n\n`;  // Empty braces for no input
                } else {
                    giftContent += `::${questionText}:: ${questionText} { ${correctAnswer} }\n\n`;  // Insert the full essay
                }
            }
        }

        // 5. Insert the GIFT content into the active editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.start, giftContent);
            }).then(success => {
                if (success) {
                    vscode.window.showInformationMessage('CSV file successfully converted to GIFT format.');
                } else {
                    vscode.window.showErrorMessage('Failed to insert GIFT content.');
                }
            });
        } else {
            vscode.window.showErrorMessage('No active text editor found. Open a file to insert the content.');
        }

        // Open the file immediately after it is selected
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    });

    context.subscriptions.push(importCsvDisposable);
}

export function deactivate() {
    console.log('Deactivating moodle-gift-tools extension...');
}


