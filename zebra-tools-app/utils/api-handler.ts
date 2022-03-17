// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type ResolvesTo<T> = T | Promise<T>;
type MethodHandler<R> = (query : any, body : any, cookies : any) => ResolvesTo<R>;
type MethodDefinition<Response = {}> = {
    name? : string;
    func  : MethodHandler<Response>;
}

type ApiDefinition<
    GetResponse    = {},
    PostResponse   = {},
    PutResponse    = {},
    DeleteResponse = {}
> = {
    GET     : MethodHandler<GetResponse>    | MethodDefinition<GetResponse>;
    POST?   : MethodHandler<PostResponse>   | MethodDefinition<PostResponse>;
    PUT?    : MethodHandler<PutResponse>    | MethodDefinition<PutResponse>;
    DELETE? : MethodHandler<DeleteResponse> | MethodDefinition<DeleteResponse>;
}

export function NextApiHandler<G, P, Q, D>(apiDefinition : ApiDefinition<G, P, Q, D>)
{
    return async (req: NextApiRequest, res: NextApiResponse<G | P | Q| D | String>) => {
        const methodDefinition = apiDefinition[req.method as 'GET' | 'POST' | 'PUT' | 'DELETE'];
        if (!methodDefinition) return res.status(405).send('METHOD NOT ALLOWED');

        const methodFunction = typeof methodDefinition === 'function' ? methodDefinition : methodDefinition.func;

        try
        {
            const responseJson = await methodFunction(req.query, req.body, req.cookies);
            return res.status(200).json(responseJson);
        }
        catch (err)
        {
            console.error(err);
            return res.status(500).send('SERVER ERROR');
        }
      }
}