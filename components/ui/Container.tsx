type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

const Container = ({ children, className = "" }: ContainerProps) => {
  return (
    <div className={`mx-auto w-full max-w-(--container-width) px-6 ${className}`}>
      {children}
    </div>
  );
};

export default Container;
