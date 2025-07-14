import React from 'react';
import { Card, Icon, Content, Value, Label, Subtext } from './MetricCard.styles';

const MetricCard = ({
    icon,
    value,
    valueClass,
    label,
    subtext,
    mobile = false
}) => {
    return (
        <Card mobile={mobile}>
            {typeof icon === 'string' ? (
                <Icon mobile={mobile}>{icon}</Icon>
            ) : (
                icon
            )}

            <Content mobile={mobile}>
                {value && (
                    <Value
                        mobile={mobile}
                        className={valueClass}
                    >
                        {value}
                    </Value>
                )}

                <Label mobile={mobile}>{label}</Label>

                {subtext && (
                    <Subtext mobile={mobile}>{subtext}</Subtext>
                )}
            </Content>
        </Card>
    );
};

export default MetricCard; 