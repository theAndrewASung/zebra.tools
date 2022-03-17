import { NextApiHandler } from '../../../utils/api-handler';
import { wait } from '../../../utils';

export type Printer = {
  name : string,
  ip   : string,
}

export const DATA_SOURCE_PRINTERS : Printer[] = [
  { name : 'My Favorite Printer', ip : '127.0.0.1' },
];

type GetResponse = {
  printers : Printer[];
}
type PostResponse = {
  printer : Printer;
}

export default NextApiHandler<GetResponse, PostResponse, {}, {}>({
  async GET() : Promise<GetResponse> {
    await wait(1000);

    return {
      printers : DATA_SOURCE_PRINTERS,
    };
  },
  async POST(query : {}, body : { name : string, ip : string }) : Promise<PostResponse> {
    await wait(1000);

    const printer = { name : body.name, ip : body.ip };
    DATA_SOURCE_PRINTERS.push(printer);
    console.log(DATA_SOURCE_PRINTERS);

    return { printer };
  },
});