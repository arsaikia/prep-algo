import React from 'react';
import { Ring, Text, Percentage, Label } from './ProgressRing.styles';

const ProgressRing = ({ percentage, size = 'medium', showLabel = true }) => {
    const safePercentage = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
    return (
        <Ring percentage={safePercentage} size={size}>
            <Text>
                <Percentage size={size}>
                    {Math.round(safePercentage)}%
                </Percentage>
                {showLabel && (
                    <Label size={size}>Today</Label>
                )}
            </Text>
        </Ring>
    );
};

export default ProgressRing; 