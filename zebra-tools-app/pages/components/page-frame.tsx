import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container, Menu, Sidebar, Icon, Segment, Header, Button } from 'semantic-ui-react';

export function PageFrame(props : PropsWithChildren<{}>) {
    const router = useRouter();
    const asPath = router.asPath;
    const menuItems = [
        {
            header : 'Printers',
            children : [
                {
                    name  : 'printers',
                    title : 'ZPL Printers',
                    route : '/printers',
                }
            ]
        },
        {
            header : 'Settings',
            children : [
                {
                    name  : 'settings',
                    title : 'User Settings',
                    route : '/settings',
                }
            ]
        }
    ];

    return (
        <Container fluid style={{ height : '100vh', display: 'flex' }}>
            <Sidebar as={Menu}
                visible
                vertical
                inverted
            >
                <Menu.Item>
                    <Menu.Header as='h2'>
                        <Icon name='print' />
                        ZPL Printer Tools
                    </Menu.Header>
                </Menu.Item>
                {
                    menuItems.map(section => (
                        <Menu.Item>
                            <Menu.Header> {section.header} </Menu.Header>
                            <Menu.Menu>
                            {
                                section.children.map(child => (
                                    <Menu.Item
                                        name={child.name}
                                        active={child.route === asPath}
                                    >
                                        <Link href={child.route}>
                                            {child.title}
                                        </Link>
                                    </Menu.Item>
                                ))
                            }
                            </Menu.Menu>
                        </Menu.Item>
                    ))
                }
            </Sidebar>
            <Segment basic padded style={{ marginLeft : '260px', flex : '1 1 auto' }}>
                { props.children }
            </Segment>
        </Container>
    );
}