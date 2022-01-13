/**
 * The 3 types of Zebra SGD commands: setvar, getvar, or do
 */
export type SGDCommandType = 'setvar'|'getvar'|'do';

/**
 * Object representation of a Zebra SGD (Set-Get-Do) Command
 * 
 * https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf#page=561
 * 
 * SGD commands must be terminated by a carriage return or a space and line feed, and the
 * command, attributes, and values must be specified in lower case. 
 * 
 */
export class ZebraSGDCommand
{
	private commandType : SGDCommandType;
	private attribute : string;
	private value : string;

	constructor(commandType : SGDCommandType, attribute : string, value : string)
	{
		this.commandType = commandType;
		this.attribute   = attribute;
		this.value       = value;
	}

	toString()
	{
		const cmd = `! U1 ${this.commandType} "${this.attribute}"`;
		if (this.commandType === 'getvar') return cmd;

		return cmd + ` "${this.value}"`;
	}
}