import React from 'react';
import { Ring, Text, Percentage, Label } from './ProgressRing.styles';

const ProgressRing = ({ percentage, size = 'medium', showLabel = true }) => {
    return (
        <Ring percentage={percentage} size={size}>
            <Text>
                <Percentage size={size}>
                    {Math.round(percentage)}%
                </Percentage>
                {showLabel && (
                    <Label size={size}>Today</Label>
                )}
            </Text>
        </Ring>
    );
};

export default ProgressRing; 