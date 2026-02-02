import { m } from 'framer-motion';


const PageWrapper = ({ children }) => {
    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 0.3,
                ease: "linear"
            }}
            className="w-full h-full flex flex-col relative"
            style={{ willChange: 'opacity, transform' }}
        >
            {/* Liquid highlight effect on transition */}
            <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 bg-primary/5 pointer-events-none z-[99]"
            />
            {children}
        </m.div>
    );
};


export default PageWrapper;
