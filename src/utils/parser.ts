export function expressIdToFirebaseId(id: string | Array<string>) {
    if (typeof id !== 'string') id = id[0];

    return id;
}