import type { NextPage } from 'next';
import { Button, Icon, Segment, Header, Grid, Card, Modal, Form, Input, ButtonProps } from 'semantic-ui-react';

import 'semantic-ui-css/semantic.min.css';
import { PropsWithChildren, SyntheticEvent, useEffect, useState } from 'react';

type PrinterObj =
{
    name? : string;
    ip    : string;
};

const PagePrinters : NextPage = () => {
    const [ newPrinterModalOpen, setNewPrinterModalOpen ] = useState(false);
    const [ loading, setLoading ] = useState(false);
    const [ printers, setPrinters ] = useState<PrinterObj[]>([]);

    useEffect(() => {
        setLoading(true);
        fetch('/api/printers')
            .then(response => response.json())
            .then(responseJson =>
            {
                setPrinters(responseJson?.printers || []);
            })
            .catch(err =>
            {
                console.error(err);
            })
            .finally(() =>
            {
                setLoading(false);
            })
    }, []);

    const addNewPrinter = function(printer : PrinterObj) {
        setPrinters(printers.slice(0).concat([ printer ]));
    }

    const PrinterModal = (props : PropsWithChildren<{ open? : boolean, onClose : Function }>) => {
        const [ working,     setWorking     ] = useState(false);
        const [ printerIp,   setPrinterIp   ] = useState('');
        const [ printerName, setPrinterName ] = useState('');

        const onAddPrinter = (event : SyntheticEvent<HTMLButtonElement, MouseEvent>, data : ButtonProps) => {
            setWorking(true);
            const printer =
            {
                name : printerName,
                ip   : printerIp, 
            }
            const body = JSON.stringify(printer);
            fetch('/api/printers', { method : 'POST', body, headers : { 'Content-Type' : 'application/json' } })
                .then(response => response.json())
                .then(responseJson =>
                {
                    console.log(responseJson);
                    addNewPrinter(responseJson.printer);
                    if (props.onClose) props.onClose(event);
                })
                .catch(err =>
                {
                    console.error(err);
                })
                .finally(() =>
                {
                    setWorking(false);
                });
        };

        return <Modal
            open={props.open}
            centered={false}
            size='tiny'
        >
            <Modal.Header> Add a ZPL Printer </Modal.Header>
            <Modal.Content>
                { printerIp }
                <Form>
                    <Form.Field>
                        <label> Printer IP </label>
                        <Input
                            value={printerIp}
                            placeholder='127.0.0.1'
                            onChange={event => setPrinterIp(event.target.value)}
                        />
                    </Form.Field>
                    <Form.Field>
                        <label> Printer Name </label>
                        <Input
                            value={printerName}
                            placeholder='Name'
                            onChange={event => setPrinterName(event.target.value)}
                        />
                    </Form.Field>
                </Form>
            </Modal.Content>
            <Modal.Actions>
                <Button
                    disabled={working}
                    onClick={event => props.onClose ? props.onClose(event) : null }
                >
                    Cancel
                </Button>
                <Button
                    color='green'
                    icon='add'
                    disabled={working}
                    onClick={onAddPrinter}
                >
                    Add Printer
                </Button>
            </Modal.Actions>
        </Modal>
    };

    const ButtonAddZPLPrinter = (props : PropsWithChildren<{ [ propName : string ] : any }>) => (
        <Button
            color='green'
            onClick={() => setNewPrinterModalOpen(true)}
            {...props}
        >
            <Icon name='add' />
            Add a ZPL Printer
        </Button>
    );

    const SegmentNoPrinters = () => (
        <Segment placeholder loading={loading}>
            <Header icon>
                <Icon name='print' />
                No ZPL printers have been added.
            </Header>
            <ButtonAddZPLPrinter />
        </Segment>
    );

    const SegmentPrinters = () => (
        <Segment basic>
            <Card.Group>
                { printers.map(printer => 
                    <Card>
                        <Card.Content>
                            <Card.Header> {printer.name || printer.ip} </Card.Header>
                            <Card.Meta> {printer.ip} </Card.Meta>
                        </Card.Content>
                        <Card.Content extra>
                            <Button size='mini'> Remove </Button>
                            <Button primary size='mini'> Connect </Button>
                        </Card.Content>
                    </Card>
                ) }
            </Card.Group>
        </Segment>
    )

    return (
        <section>
            <Grid>
                <PrinterModal open={newPrinterModalOpen} onClose={() => setNewPrinterModalOpen(false)} />
                <Grid.Row columns={2}>
                    <Grid.Column>
                        <Header as='h2'> ZPL Printers </Header>
                    </Grid.Column>
                    {
                        !printers.length ? null : <Grid.Column textAlign='right'>
                            <ButtonAddZPLPrinter />
                        </Grid.Column>
                    }
                </Grid.Row>
                <Grid.Row>
                    <Grid.Column>
                        { !printers.length ? <SegmentNoPrinters /> : <SegmentPrinters /> }
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </section>
    );
}

export default PagePrinters;