import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children }) => {
    const [mountNode] = useState(() => {
        const div = document.createElement('div');
        div.style.zIndex = '99999'; // Keep z-index just in case, but no layout styles
        return div;
    });

    useEffect(() => {
        document.body.appendChild(mountNode);
        return () => {
            if (document.body.contains(mountNode)) {
                document.body.removeChild(mountNode);
            }
        };
    }, [mountNode]);

    return createPortal(children, mountNode);
};

export default Portal;
