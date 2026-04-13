import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class DepNodeProvider implements vscode.TreeDataProvider<Menu> {

	private _onDidChangeTreeData: vscode.EventEmitter<Menu | undefined | void> = new vscode.EventEmitter<Menu | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Menu | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Menu): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Menu): Thenable<Menu[]>|Thenable<Task[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No Menu in empty workspace');
			return Promise.resolve([]);
		}

        if (element){
            const list = this.readDirectory(path.join(this.workspaceRoot, 'Input', element.label));
            const result:Task[] = [];
            for(const temp of list){
                const rootPath = path.join(this.workspaceRoot, 'Input', element.label, temp);
                result.push(new Task(
                    temp,
                    vscode.TreeItemCollapsibleState.None,
                    rootPath,
                    `${path.join('Input', element.label, temp)}`,
                    {command: 'Christmas.runDouble', title: '', arguments:[`${path.join('Input', element.label, temp)}`]}
                ));
            }
            return Promise.resolve(result);
        } else {
            const list = this.readDirectory(path.join(this.workspaceRoot, 'Input'));
            const result:Menu[] = [];
            for(const temp of list){         
                result.push(new Menu(
                    temp,
                    temp!=="ShellExcute"?vscode.TreeItemCollapsibleState.Collapsed:vscode.TreeItemCollapsibleState.Expanded,
                ));
            }
            return Promise.resolve(result);
        }
	}

    readDirectory(url: string): string[] {
        const list: string[] = [];
        const files = fs.readdirSync(url);
        for (const file of files) {
            var stats = fs.statSync(path.join(url,file));
            if(stats.isDirectory()){
                list.push(file);
            }
        }
        return list;
	}
}

export class Menu extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}
}

export class Task extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly rootPath: string,
        public readonly task: string,
		public readonly command?: vscode.Command,
        targetFile?:string
	) {
		super(label, collapsibleState);
        this.tooltip = this.label;
        this.targetFile = targetFile || "";
	}

	iconPath = {
		light: path.join(__filename,'../', '../', 'resources', 'light', 'circle-outline.svg'),
		dark: path.join(__filename,'../', '../', 'resources', 'dark', 'circle-outline.svg')
	};

    public targetFile: string;

    contextValue = 'task';
}
