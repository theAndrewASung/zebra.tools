import { NextApiHandler } from '../../../utils/api-handler';
import { wait } from '../../../utils';

import { DATA_SOURCE_PRINTERS, Printer } from './index';

type GetResponse = {
  printer : Printer;
}
type PostResponse = {
  printer : Printer;
}
type DeleteResponse = {};

type Query = { ip : string };

export default NextApiHandler<GetResponse, PostResponse, {}, DeleteResponse>({
  async GET(query : Query) : Promise<GetResponse> {
    const printer = DATA_SOURCE_PRINTERS.find(p => p.ip === query.ip);
    if (!printer) throw new Error('Not found');
    await wait(1000);

    return { printer };
  },
  async POST(query : Query, body : { name : string }) : Promise<PostResponse> {
    const printer = DATA_SOURCE_PRINTERS.find(p => p.ip === query.ip);
    if (!printer) throw new Error('Not found');
    await wait(1000);

    printer.name = body.name || printer.name;

    return { printer };
  },
  async DELETE(query : Query) : Promise <DeleteResponse> {
    const printer = DATA_SOURCE_PRINTERS.find(p => p.ip === query.ip);
    if (!printer) throw new Error('Not found');
    await wait(1000);

    DATA_SOURCE_PRINTERS.splice(DATA_SOURCE_PRINTERS.indexOf(printer), 1);

    return {};
  },
});