'use client';

import { FC } from 'react';

interface TravelerInfoProps {
    travelerInfo: string;
    setTravelerInfo: (value: string) => void;
}

const TravelerInfoForm: FC<TravelerInfoProps> = ({ travelerInfo, setTravelerInfo }) => {
    return (
        <div>
            <label htmlFor="travelerInfo" className="block text-sm font-medium text-gray-700 mb-1">
                Traveler Info (JSON)
            </label>
            <textarea
                id="travelerInfo"
                name="travelerInfo"
                rows={15}
                value={travelerInfo}
                onChange={(e) => setTravelerInfo(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 font-mono text-black"
                required
            />
        </div>
    );
};

export default TravelerInfoForm;
